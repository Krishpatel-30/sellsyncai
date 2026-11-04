import re
import secrets
import uuid
from datetime import datetime, timedelta, timezone
from typing import Annotated, Any, Dict, List
from fastapi import APIRouter, Depends, Header, Request, status
from sqlalchemy import select, update
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.api.deps import get_current_user, security_scheme
from app.core.audit import log_audit_event
from app.core.exceptions import (
    ConflictException,
    NotFoundException,
    TenantAccessDeniedException,
    UnauthorizedException,
)
from app.core.rbac import Role
from app.core.security import (
    create_access_token,
    create_refresh_token,
    decode_refresh_token,
    get_password_hash,
    hash_token,
    verify_password,
)
from app.db.session import get_db
from app.models.membership import TenantMembership
from app.models.tenant import Tenant
from app.models.token import RefreshToken
from app.models.user import User
from app.schemas.tenant import TenantResponse
from app.schemas.token import RefreshTokenRequest, SwitchWorkspaceRequest, TokenResponse
from app.schemas.user import (
    GoogleLoginRequest,
    PasswordResetConfirm,
    PasswordResetRequest,
    UserCreate,
    UserLogin,
    UserResponse,
)

router = APIRouter(prefix="/auth", tags=["Authentication"])


def slugify(text: str) -> str:
    """Generate a clean URL slug."""
    text = text.lower().strip()
    text = re.sub(r"[^\w\s-]", "", text)
    text = re.sub(r"[\s_-]+", "-", text)
    return text.strip("-")


@router.post("/register", response_model=TokenResponse, status_code=status.HTTP_201_CREATED)
async def register(
    data: UserCreate,
    request: Request,
    db: Annotated[AsyncSession, Depends(get_db)]
) -> TokenResponse:
    """Register a new seller account and create their primary workspace."""
    # Check if user already exists
    existing_user = await db.execute(select(User).where(User.email == data.email.lower()))
    if existing_user.scalar_one_or_none():
        raise ConflictException("An account with this email address already exists")

    # Create User
    new_user = User(
        email=data.email.lower(),
        hashed_password=get_password_hash(data.password),
        full_name=data.full_name,
        is_active=True,
        is_verified=False,
    )
    db.add(new_user)
    await db.flush()

    # Create Primary Workspace
    ws_name = data.workspace_name or f"{data.full_name}'s Store"
    base_slug = slugify(ws_name)
    slug = f"{base_slug}-{secrets.token_hex(3)}"

    new_tenant = Tenant(
        name=ws_name,
        slug=slug,
        status="TRIAL",
        currency="INR",
    )
    db.add(new_tenant)
    await db.flush()

    # Assign user as WORKSPACE_OWNER
    membership = TenantMembership(
        tenant_id=new_tenant.id,
        user_id=new_user.id,
        role=Role.WORKSPACE_OWNER.value,
        is_active=True,
    )
    db.add(membership)
    await db.flush()

    # Generate Tokens
    access_token = create_access_token(
        subject=new_user.id,
        tenant_id=new_tenant.id,
        role=Role.WORKSPACE_OWNER.value
    )
    raw_refresh_token = create_refresh_token(subject=new_user.id)

    # Save hashed refresh token
    db_refresh = RefreshToken(
        user_id=new_user.id,
        token_hash=hash_token(raw_refresh_token),
        expires_at=datetime.now(timezone.utc) + timedelta(days=7),
    )
    db.add(db_refresh)

    # Log audit event
    await log_audit_event(
        db=db,
        action="auth.register",
        tenant_id=new_tenant.id,
        user_id=new_user.id,
        resource_type="user",
        resource_id=str(new_user.id),
        details={"workspace": ws_name, "email": new_user.email},
        request=request,
    )

    await db.commit()
    await db.refresh(new_user)
    await db.refresh(new_tenant)

    return TokenResponse(
        access_token=access_token,
        refresh_token=raw_refresh_token,
        token_type="bearer",
        expires_in=3600,
        user=UserResponse.model_validate(new_user),
        active_tenant=TenantResponse.model_validate(new_tenant),
        role=Role.WORKSPACE_OWNER.value,
    )


@router.post("/login", response_model=TokenResponse)
async def login(
    data: UserLogin,
    request: Request,
    db: Annotated[AsyncSession, Depends(get_db)]
) -> TokenResponse:
    """Authenticate user and return access & refresh tokens."""
    res = await db.execute(
        select(User)
        .where(User.email == data.email.lower())
        .options(
            selectinload(User.memberships).selectinload(TenantMembership.tenant)
        )
    )
    user = res.scalar_one_or_none()

    if not user or not verify_password(data.password, user.hashed_password):
        raise UnauthorizedException("Invalid email or password")

    if not user.is_active:
        raise UnauthorizedException("Account has been suspended or deactivated")

    # Resolve active workspace
    active_membership = next((m for m in user.memberships if m.is_active), None)
    active_tenant = active_membership.tenant if active_membership else None
    role = active_membership.role if active_membership else (Role.SUPER_ADMIN.value if user.is_superadmin else Role.VIEWER.value)

    # Generate tokens
    access_token = create_access_token(
        subject=user.id,
        tenant_id=active_tenant.id if active_tenant else None,
        role=role,
    )
    raw_refresh_token = create_refresh_token(subject=user.id)

    db_refresh = RefreshToken(
        user_id=user.id,
        token_hash=hash_token(raw_refresh_token),
        expires_at=datetime.now(timezone.utc) + timedelta(days=7),
    )
    db.add(db_refresh)

    await log_audit_event(
        db=db,
        action="auth.login",
        tenant_id=active_tenant.id if active_tenant else None,
        user_id=user.id,
        resource_type="user",
        resource_id=str(user.id),
        details={"email": user.email},
        request=request,
    )

    await db.commit()

    return TokenResponse(
        access_token=access_token,
        refresh_token=raw_refresh_token,
        token_type="bearer",
        expires_in=3600,
        user=UserResponse.model_validate(user),
        active_tenant=TenantResponse.model_validate(active_tenant) if active_tenant else None,
        role=role,
    )


@router.post("/google", response_model=TokenResponse)
async def google_auth(
    data: GoogleLoginRequest,
    request: Request,
    db: Annotated[AsyncSession, Depends(get_db)]
) -> TokenResponse:
    """Authenticate or register a user via Google OAuth / Sign-In."""
    import base64
    import json

    email = data.email
    full_name = data.full_name
    avatar_url = data.avatar_url or "https://lh3.googleusercontent.com/a/default-user"

    # If credential JWT token is passed, extract unverified payload claims
    if data.credential:
        try:
            parts = data.credential.split(".")
            if len(parts) >= 2:
                padded = parts[1] + "=" * ((4 - len(parts[1]) % 4) % 4)
                decoded_bytes = base64.urlsafe_b64decode(padded)
                token_claims = json.loads(decoded_bytes.decode("utf-8"))
                email = token_claims.get("email", email)
                full_name = token_claims.get("name", full_name)
                avatar_url = token_claims.get("picture", avatar_url)
        except Exception:
            pass

    if not email:
        email = "seller.google@sellsync.ai"
    if not full_name:
        clean_name = str(email).split("@")[0].replace(".", " ").title()
        full_name = f"{clean_name} (Google)"

    # Look up user
    res = await db.execute(
        select(User)
        .where(User.email == str(email).lower())
        .options(
            selectinload(User.memberships).selectinload(TenantMembership.tenant)
        )
    )
    user = res.scalar_one_or_none()

    if not user:
        user = User(
            email=str(email).lower(),
            hashed_password=get_password_hash(secrets.token_hex(24)),
            full_name=full_name,
            avatar_url=avatar_url,
            is_active=True,
            is_verified=True,
        )
        db.add(user)
        await db.flush()

        ws_name = f"{full_name}'s Store"
        base_slug = slugify(ws_name)
        slug = f"{base_slug}-{secrets.token_hex(3)}"

        tenant = Tenant(
            name=ws_name,
            slug=slug,
            status="TRIAL",
            currency="INR",
        )
        db.add(tenant)
        await db.flush()

        membership = TenantMembership(
            tenant_id=tenant.id,
            user_id=user.id,
            role=Role.WORKSPACE_OWNER.value,
            is_active=True,
        )
        db.add(membership)
        await db.flush()

        active_tenant = tenant
        role = Role.WORKSPACE_OWNER.value
    else:
        if not user.is_active:
            raise UnauthorizedException("Account has been suspended or deactivated")

        if avatar_url and not user.avatar_url:
            user.avatar_url = avatar_url

        active_membership = next((m for m in user.memberships if m.is_active), None)
        if not active_membership:
            ws_name = f"{user.full_name}'s Store"
            base_slug = slugify(ws_name)
            slug = f"{base_slug}-{secrets.token_hex(3)}"
            tenant = Tenant(
                name=ws_name,
                slug=slug,
                status="TRIAL",
                currency="INR",
            )
            db.add(tenant)
            await db.flush()
            active_membership = TenantMembership(
                tenant_id=tenant.id,
                user_id=user.id,
                role=Role.WORKSPACE_OWNER.value,
                is_active=True,
            )
            db.add(active_membership)
            await db.flush()
            active_tenant = tenant
            role = Role.WORKSPACE_OWNER.value
        else:
            active_tenant = active_membership.tenant
            role = active_membership.role

    access_token = create_access_token(
        subject=user.id,
        tenant_id=active_tenant.id if active_tenant else None,
        role=role,
    )
    raw_refresh_token = create_refresh_token(subject=user.id)

    db_refresh = RefreshToken(
        user_id=user.id,
        token_hash=hash_token(raw_refresh_token),
        expires_at=datetime.now(timezone.utc) + timedelta(days=7),
    )
    db.add(db_refresh)

    await log_audit_event(
        db=db,
        action="auth.google_login",
        tenant_id=active_tenant.id if active_tenant else None,
        user_id=user.id,
        resource_type="user",
        resource_id=str(user.id),
        details={"email": user.email, "provider": "google"},
        request=request,
    )

    await db.commit()
    await db.refresh(user)

    return TokenResponse(
        access_token=access_token,
        refresh_token=raw_refresh_token,
        token_type="bearer",
        expires_in=3600,
        user=UserResponse.model_validate(user),
        active_tenant=TenantResponse.model_validate(active_tenant) if active_tenant else None,
        role=role,
    )


@router.post("/refresh", response_model=TokenResponse)
async def refresh_token(
    data: RefreshTokenRequest,
    db: Annotated[AsyncSession, Depends(get_db)]
) -> TokenResponse:
    """Validate refresh token and issue a fresh access/refresh token pair."""
    payload = decode_refresh_token(data.refresh_token)
    if not payload or not payload.get("sub"):
        raise UnauthorizedException("Invalid or expired refresh token")

    try:
        user_id = uuid.UUID(payload["sub"])
    except ValueError:
        raise UnauthorizedException("Malformed subject in refresh token")

    token_h = hash_token(data.refresh_token)
    r_res = await db.execute(
        select(RefreshToken).where(
            RefreshToken.token_hash == token_h,
            RefreshToken.user_id == user_id,
            RefreshToken.revoked == False,
        )
    )
    db_token = r_res.scalar_one_or_none()
    if not db_token:
        raise UnauthorizedException("Refresh token was revoked or expired")

    # Expiration check
    expires_at = db_token.expires_at
    if expires_at.tzinfo is None:
        expires_at = expires_at.replace(tzinfo=timezone.utc)
    if expires_at < datetime.now(timezone.utc):
        db_token.revoked = True
        await db.commit()
        raise UnauthorizedException("Refresh token was revoked or expired")

    # Revoke used refresh token (rotation)
    db_token.revoked = True

    # Fetch user
    u_res = await db.execute(
        select(User)
        .where(User.id == user_id)
        .options(
            selectinload(User.memberships).selectinload(TenantMembership.tenant)
        )
    )
    user = u_res.scalar_one_or_none()
    if not user or not user.is_active:
        raise UnauthorizedException("User inactive or deleted")

    active_membership = next((m for m in user.memberships if m.is_active), None)
    active_tenant = active_membership.tenant if active_membership else None
    role = active_membership.role if active_membership else (Role.SUPER_ADMIN.value if user.is_superadmin else Role.VIEWER.value)

    new_access_token = create_access_token(
        subject=user.id,
        tenant_id=active_tenant.id if active_tenant else None,
        role=role
    )
    new_raw_refresh = create_refresh_token(subject=user.id)

    db_new_refresh = RefreshToken(
        user_id=user.id,
        token_hash=hash_token(new_raw_refresh),
        expires_at=datetime.now(timezone.utc) + timedelta(days=7),
    )
    db.add(db_new_refresh)
    await db.commit()

    return TokenResponse(
        access_token=new_access_token,
        refresh_token=new_raw_refresh,
        token_type="bearer",
        expires_in=3600,
        user=UserResponse.model_validate(user),
        active_tenant=TenantResponse.model_validate(active_tenant) if active_tenant else None,
        role=role,
    )


@router.post("/logout", status_code=status.HTTP_200_OK)
async def logout(
    current_user: Annotated[User, Depends(get_current_user)],
    db: Annotated[AsyncSession, Depends(get_db)],
    data: Optional[RefreshTokenRequest] = None,
) -> Dict[str, str]:
    """Revoke refresh token on logout."""
    if data and data.refresh_token:
        token_h = hash_token(data.refresh_token)
        await db.execute(
            update(RefreshToken)
            .where(RefreshToken.token_hash == token_h, RefreshToken.user_id == current_user.id)
            .values(revoked=True)
        )
    else:
        # Revoke all tokens for user
        await db.execute(
            update(RefreshToken)
            .where(RefreshToken.user_id == current_user.id)
            .values(revoked=True)
        )

    await db.commit()
    return {"message": "Successfully logged out"}


@router.get("/me", response_model=Dict[str, Any])
async def get_me(
    current_user: Annotated[User, Depends(get_current_user)],
    db: Annotated[AsyncSession, Depends(get_db)]
) -> Dict[str, Any]:
    """Return user profile and active workspace memberships."""
    res = await db.execute(
        select(User)
        .where(User.id == current_user.id)
        .options(
            selectinload(User.memberships).selectinload(TenantMembership.tenant)
        )
    )
    user = res.scalar_one()

    workspaces = []
    for m in user.memberships:
        if m.is_active and m.tenant:
            workspaces.append({
                "id": str(m.tenant.id),
                "name": m.tenant.name,
                "slug": m.tenant.slug,
                "status": m.tenant.status,
                "currency": m.tenant.currency,
                "role": m.role,
                "joined_at": m.joined_at.isoformat(),
            })

    return {
        "user": UserResponse.model_validate(user),
        "workspaces": workspaces,
    }


@router.post("/switch-workspace", response_model=TokenResponse)
async def switch_workspace(
    data: SwitchWorkspaceRequest,
    current_user: Annotated[User, Depends(get_current_user)],
    db: Annotated[AsyncSession, Depends(get_db)]
) -> TokenResponse:
    """Switch active tenant and issue a refreshed token with the new tenant context."""
    if current_user.is_superadmin:
        t_res = await db.execute(select(Tenant).where(Tenant.id == data.tenant_id))
        tenant = t_res.scalar_one_or_none()
        if not tenant:
            raise NotFoundException("Workspace", data.tenant_id)
        role = Role.SUPER_ADMIN.value
    else:
        m_res = await db.execute(
            select(TenantMembership)
            .where(
                TenantMembership.tenant_id == data.tenant_id,
                TenantMembership.user_id == current_user.id,
                TenantMembership.is_active == True
            )
            .options(selectinload(TenantMembership.tenant))
        )
        membership = m_res.scalar_one_or_none()
        if not membership:
            raise TenantAccessDeniedException("You are not a member of this workspace")
        tenant = membership.tenant
        role = membership.role

    new_access_token = create_access_token(
        subject=current_user.id,
        tenant_id=tenant.id,
        role=role
    )
    new_raw_refresh = create_refresh_token(subject=current_user.id)

    db_new_refresh = RefreshToken(
        user_id=current_user.id,
        token_hash=hash_token(new_raw_refresh),
        expires_at=datetime.now(timezone.utc) + timedelta(days=7),
    )
    db.add(db_new_refresh)
    await db.commit()

    return TokenResponse(
        access_token=new_access_token,
        refresh_token=new_raw_refresh,
        token_type="bearer",
        expires_in=3600,
        user=UserResponse.model_validate(current_user),
        active_tenant=TenantResponse.model_validate(tenant),
        role=role,
    )
