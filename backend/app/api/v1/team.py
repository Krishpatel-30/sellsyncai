import secrets
import uuid
from datetime import datetime, timedelta, timezone
from typing import Annotated, Any, Dict, List
from fastapi import APIRouter, Depends, Request, status
from sqlalchemy import select, update
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.api.deps import (
    TenantContext,
    get_current_tenant_context,
    get_current_user,
    require_permission,
)
from app.core.audit import log_audit_event
from app.core.exceptions import (
    ConflictException,
    ForbiddenException,
    NotFoundException,
    UnauthorizedException,
)
from app.core.rbac import Permission, Role
from app.core.security import hash_token
from app.db.session import get_db
from app.models.invitation import WorkspaceInvitation
from app.models.membership import TenantMembership
from app.models.user import User
from app.schemas.team import (
    AcceptInvitationRequest,
    InvitationResponse,
    InviteMemberRequest,
    TeamMemberResponse,
    UpdateMemberRoleRequest,
)
from app.services.entitlement_service import EntitlementService

router = APIRouter(prefix="/team", tags=["Team & Memberships"])


@router.get("/members", response_model=List[TeamMemberResponse])
async def list_team_members(
    context: Annotated[TenantContext, Depends(require_permission(Permission.TEAM_VIEW))],
    db: Annotated[AsyncSession, Depends(get_db)]
) -> List[TeamMemberResponse]:
    """List all team members for the active workspace."""
    res = await db.execute(
        select(TenantMembership)
        .where(TenantMembership.tenant_id == context.tenant.id)
        .options(selectinload(TenantMembership.user))
        .order_by(TenantMembership.created_at.asc())
    )
    members = res.scalars().all()
    return [TeamMemberResponse.model_validate(m) for m in members]


@router.post("/invite", response_model=Dict[str, Any], status_code=status.HTTP_201_CREATED)
async def invite_team_member(
    data: InviteMemberRequest,
    context: Annotated[TenantContext, Depends(require_permission(Permission.TEAM_MANAGE))],
    current_user: Annotated[User, Depends(get_current_user)],
    request: Request,
    db: Annotated[AsyncSession, Depends(get_db)]
) -> Dict[str, Any]:
    """Invite a new team member to the workspace."""
    # Enforce team user limit for the current subscription plan
    await EntitlementService.check_user_limit(db, context.tenant.id)

    # Check if user is already an active member
    u_res = await db.execute(select(User).where(User.email == data.email.lower()))
    existing_user = u_res.scalar_one_or_none()

    if existing_user:
        m_res = await db.execute(
            select(TenantMembership).where(
                TenantMembership.tenant_id == context.tenant.id,
                TenantMembership.user_id == existing_user.id
            )
        )
        if m_res.scalar_one_or_none():
            raise ConflictException("User is already a member of this workspace")

    # Generate invite token
    raw_token = secrets.token_urlsafe(32)
    token_h = hash_token(raw_token)

    invitation = WorkspaceInvitation(
        tenant_id=context.tenant.id,
        email=data.email.lower(),
        role=data.role.value,
        token_hash=token_h,
        status="PENDING",
        invited_by=current_user.id,
        expires_at=datetime.now(timezone.utc) + timedelta(days=7),
    )
    db.add(invitation)

    await log_audit_event(
        db=db,
        action="team.invite",
        tenant_id=context.tenant.id,
        user_id=current_user.id,
        resource_type="invitation",
        details={"email": data.email, "role": data.role.value},
        request=request,
    )

    await db.commit()
    await db.refresh(invitation)

    return {
        "id": str(invitation.id),
        "email": invitation.email,
        "role": invitation.role,
        "status": invitation.status,
        "token": raw_token,  # In production, emailed via SMTP/SES
        "expires_at": invitation.expires_at.isoformat(),
        "invite_link": f"/accept-invite?token={raw_token}",
    }


@router.get("/invitations", response_model=List[InvitationResponse])
async def list_pending_invitations(
    context: Annotated[TenantContext, Depends(require_permission(Permission.TEAM_MANAGE))],
    db: Annotated[AsyncSession, Depends(get_db)]
) -> List[InvitationResponse]:
    """List pending invitations for the active workspace."""
    res = await db.execute(
        select(WorkspaceInvitation)
        .where(
            WorkspaceInvitation.tenant_id == context.tenant.id,
            WorkspaceInvitation.status == "PENDING"
        )
        .order_by(WorkspaceInvitation.created_at.desc())
    )
    return [InvitationResponse.model_validate(inv) for inv in res.scalars().all()]


@router.patch("/members/{membership_id}", response_model=TeamMemberResponse)
async def update_member_role(
    membership_id: uuid.UUID,
    data: UpdateMemberRoleRequest,
    context: Annotated[TenantContext, Depends(require_permission(Permission.TEAM_MANAGE))],
    current_user: Annotated[User, Depends(get_current_user)],
    request: Request,
    db: Annotated[AsyncSession, Depends(get_db)]
) -> TeamMemberResponse:
    """Update role for an existing workspace member."""
    m_res = await db.execute(
        select(TenantMembership)
        .where(
            TenantMembership.id == membership_id,
            TenantMembership.tenant_id == context.tenant.id
        )
        .options(selectinload(TenantMembership.user))
    )
    membership = m_res.scalar_one_or_none()
    if not membership:
        raise NotFoundException("Team member", membership_id)

    # Protect workspace owner from being demoted unless by another superadmin
    if membership.role == Role.WORKSPACE_OWNER.value and not current_user.is_superadmin:
        raise ForbiddenException("Workspace owner's role cannot be modified")

    membership.role = data.role.value

    await log_audit_event(
        db=db,
        action="team.update_role",
        tenant_id=context.tenant.id,
        user_id=current_user.id,
        resource_type="membership",
        resource_id=str(membership.id),
        details={"member_id": str(membership.user_id), "new_role": data.role.value},
        request=request,
    )

    await db.commit()
    await db.refresh(membership)
    return TeamMemberResponse.model_validate(membership)


@router.delete("/members/{membership_id}", status_code=status.HTTP_200_OK)
async def remove_team_member(
    membership_id: uuid.UUID,
    context: Annotated[TenantContext, Depends(require_permission(Permission.TEAM_MANAGE))],
    current_user: Annotated[User, Depends(get_current_user)],
    request: Request,
    db: Annotated[AsyncSession, Depends(get_db)]
) -> Dict[str, str]:
    """Remove a team member from the workspace."""
    m_res = await db.execute(
        select(TenantMembership)
        .where(
            TenantMembership.id == membership_id,
            TenantMembership.tenant_id == context.tenant.id
        )
    )
    membership = m_res.scalar_one_or_none()
    if not membership:
        raise NotFoundException("Team member", membership_id)

    if membership.role == Role.WORKSPACE_OWNER.value:
        raise ForbiddenException("Cannot remove the workspace owner")

    if membership.user_id == current_user.id:
        raise ForbiddenException("Cannot remove yourself from the workspace")

    await db.delete(membership)

    await log_audit_event(
        db=db,
        action="team.remove_member",
        tenant_id=context.tenant.id,
        user_id=current_user.id,
        resource_type="membership",
        resource_id=str(membership_id),
        details={"removed_user_id": str(membership.user_id)},
        request=request,
    )

    await db.commit()
    return {"message": "Team member successfully removed"}


@router.post("/accept-invite", response_model=Dict[str, Any])
async def accept_invitation(
    data: AcceptInvitationRequest,
    current_user: Annotated[User, Depends(get_current_user)],
    request: Request,
    db: Annotated[AsyncSession, Depends(get_db)]
) -> Dict[str, Any]:
    """Accept an invitation to join a workspace."""
    token_h = hash_token(data.token)
    res = await db.execute(
        select(WorkspaceInvitation).where(
            WorkspaceInvitation.token_hash == token_h,
            WorkspaceInvitation.status == "PENDING"
        )
    )
    invitation = res.scalar_one_or_none()

    if not invitation:
        raise NotFoundException("Invitation not found or has already been used")

    exp_at = invitation.expires_at
    if exp_at.tzinfo is None:
        exp_at = exp_at.replace(tzinfo=timezone.utc)

    if exp_at < datetime.now(timezone.utc):
        invitation.status = "EXPIRED"
        await db.commit()
        raise UnauthorizedException("Invitation has expired")

    # Verify email matches current user email
    if invitation.email.lower() != current_user.email.lower():
        raise ForbiddenException(f"This invitation was addressed to {invitation.email}")

    # Check if membership already exists
    m_check = await db.execute(
        select(TenantMembership).where(
            TenantMembership.tenant_id == invitation.tenant_id,
            TenantMembership.user_id == current_user.id
        )
    )
    existing_mem = m_check.scalar_one_or_none()

    if existing_mem:
        invitation.status = "ACCEPTED"
        await db.commit()
        return {"message": "User is already a member", "workspace_id": str(invitation.tenant_id)}

    new_membership = TenantMembership(
        tenant_id=invitation.tenant_id,
        user_id=current_user.id,
        role=invitation.role,
        is_active=True,
        invited_by=invitation.invited_by,
    )
    db.add(new_membership)
    invitation.status = "ACCEPTED"

    await log_audit_event(
        db=db,
        action="team.accept_invite",
        tenant_id=invitation.tenant_id,
        user_id=current_user.id,
        resource_type="membership",
        details={"role": invitation.role},
        request=request,
    )

    await db.commit()

    return {
        "message": "Successfully joined workspace",
        "workspace_id": str(invitation.tenant_id),
        "role": invitation.role,
    }
