import uuid
from dataclasses import dataclass
from typing import Annotated, List, Optional
from fastapi import Depends, Header, Request, status
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.core.exceptions import (
    ForbiddenException,
    NotFoundException,
    TenantAccessDeniedException,
    UnauthorizedException,
)
from app.core.rbac import Permission, Role, has_permission
from app.core.security import decode_access_token
from app.db.session import get_db
from app.models.membership import TenantMembership
from app.models.tenant import Tenant
from app.models.user import User

security_scheme = HTTPBearer(auto_error=False)


@dataclass
class TenantContext:
    tenant: Tenant
    membership: Optional[TenantMembership]
    role: Role


async def get_current_user(
    credentials: Annotated[Optional[HTTPAuthorizationCredentials], Depends(security_scheme)],
    db: Annotated[AsyncSession, Depends(get_db)]
) -> User:
    """Validate JWT access token and return current active User."""
    if not credentials or credentials.scheme.lower() != "bearer":
        raise UnauthorizedException("Authentication token required")

    payload = decode_access_token(credentials.credentials)
    if not payload or not payload.get("sub"):
        raise UnauthorizedException("Invalid or expired authentication token")

    user_id_str = payload.get("sub")
    try:
        user_id = uuid.UUID(user_id_str)
    except (ValueError, TypeError):
        raise UnauthorizedException("Malformed subject in token")

    result = await db.execute(
        select(User).where(User.id == user_id)
    )
    user = result.scalar_one_or_none()

    if not user:
        raise UnauthorizedException("User no longer exists")
    if not user.is_active:
        raise UnauthorizedException("User account is inactive")

    return user


async def get_current_tenant_context(
    current_user: Annotated[User, Depends(get_current_user)],
    db: Annotated[AsyncSession, Depends(get_db)],
    x_tenant_id: Annotated[Optional[str], Header()] = None,
) -> TenantContext:
    """Resolve the active tenant context for the user and enforce workspace isolation."""
    target_tenant_id: Optional[uuid.UUID] = None

    if x_tenant_id:
        try:
            target_tenant_id = uuid.UUID(x_tenant_id)
        except ValueError:
            raise TenantAccessDeniedException("Invalid X-Tenant-ID header format")

    if target_tenant_id:
        # Check tenant exists
        t_res = await db.execute(select(Tenant).where(Tenant.id == target_tenant_id))
        tenant = t_res.scalar_one_or_none()
        if not tenant:
            raise NotFoundException("Workspace", target_tenant_id)

        # If Super Admin, grant access even without explicit membership
        if current_user.is_superadmin:
            m_res = await db.execute(
                select(TenantMembership).where(
                    TenantMembership.tenant_id == target_tenant_id,
                    TenantMembership.user_id == current_user.id
                )
            )
            membership = m_res.scalar_one_or_none()
            return TenantContext(
                tenant=tenant,
                membership=membership,
                role=Role.SUPER_ADMIN
            )

        # Check membership
        m_res = await db.execute(
            select(TenantMembership).where(
                TenantMembership.tenant_id == target_tenant_id,
                TenantMembership.user_id == current_user.id,
                TenantMembership.is_active == True
            )
        )
        membership = m_res.scalar_one_or_none()
        if not membership:
            raise TenantAccessDeniedException("You are not a member of this workspace")

        return TenantContext(
            tenant=tenant,
            membership=membership,
            role=Role(membership.role)
        )

    # If no X-Tenant-ID header was supplied, find the user's primary/first active membership
    m_res = await db.execute(
        select(TenantMembership)
        .where(
            TenantMembership.user_id == current_user.id,
            TenantMembership.is_active == True
        )
        .options(selectinload(TenantMembership.tenant))
        .order_by(TenantMembership.created_at.asc())
    )
    membership = m_res.scalars().first()

    if membership and membership.tenant:
        return TenantContext(
            tenant=membership.tenant,
            membership=membership,
            role=Role(membership.role)
        )

    # Superadmin without membership can access general system without workspace
    if current_user.is_superadmin:
        # Get first tenant if exists, or return None tenant context
        first_t = (await db.execute(select(Tenant).limit(1))).scalar_one_or_none()
        if first_t:
            return TenantContext(
                tenant=first_t,
                membership=None,
                role=Role.SUPER_ADMIN
            )

    raise TenantAccessDeniedException("No active workspace found for user. Please select or create a workspace.")


def require_role(allowed_roles: List[Role]):
    """Enforce that the user has one of the specified roles in the active tenant."""
    async def role_checker(
        context: Annotated[TenantContext, Depends(get_current_tenant_context)]
    ) -> TenantContext:
        if context.role == Role.SUPER_ADMIN:
            return context
        if context.role not in allowed_roles:
            raise ForbiddenException(
                f"Action requires one of the following roles: {[r.value for r in allowed_roles]}"
            )
        return context
    return role_checker


def require_permission(permission: Permission):
    """Enforce that the user has a specific permission in the active tenant."""
    async def permission_checker(
        context: Annotated[TenantContext, Depends(get_current_tenant_context)]
    ) -> TenantContext:
        if context.role == Role.SUPER_ADMIN:
            return context
        if not has_permission(context.role, permission):
            raise ForbiddenException(
                f"Missing required permission: '{permission.value}'"
            )
        return context
    return permission_checker


async def require_superadmin(
    current_user: Annotated[User, Depends(get_current_user)]
) -> User:
    """Enforce platform-wide Super Admin privileges."""
    if not current_user.is_superadmin:
        raise ForbiddenException("Platform Super Admin privilege required")
    return current_user

