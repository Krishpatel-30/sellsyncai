import secrets
import uuid
from typing import Annotated, List
from fastapi import APIRouter, Depends, Request, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.api.deps import (
    TenantContext,
    get_current_tenant_context,
    get_current_user,
    require_permission,
    require_role,
)
from app.api.v1.auth import slugify
from app.core.audit import log_audit_event
from app.core.exceptions import ConflictException, NotFoundException
from app.core.rbac import Permission, Role
from app.db.session import get_db
from app.models.membership import TenantMembership
from app.models.tenant import Tenant
from app.models.user import User
from app.schemas.tenant import TenantCreate, TenantResponse, TenantUpdate, TenantWithRoleResponse

router = APIRouter(prefix="/workspaces", tags=["Workspaces"])


@router.get("", response_model=List[TenantWithRoleResponse])
async def list_user_workspaces(
    current_user: Annotated[User, Depends(get_current_user)],
    db: Annotated[AsyncSession, Depends(get_db)]
) -> List[TenantWithRoleResponse]:
    """List all workspaces the current user belongs to."""
    if current_user.is_superadmin:
        # Super Admin sees all tenants
        t_res = await db.execute(select(Tenant).order_by(Tenant.created_at.desc()))
        tenants = t_res.scalars().all()
        return [
            TenantWithRoleResponse(
                id=t.id,
                name=t.name,
                slug=t.slug,
                status=t.status,
                currency=t.currency,
                logo_url=t.logo_url,
                created_at=t.created_at,
                updated_at=t.updated_at,
                role=Role.SUPER_ADMIN.value,
                is_active=True,
            )
            for t in tenants
        ]

    res = await db.execute(
        select(TenantMembership)
        .where(TenantMembership.user_id == current_user.id)
        .options(selectinload(TenantMembership.tenant))
        .order_by(TenantMembership.joined_at.desc())
    )
    memberships = res.scalars().all()

    items = []
    for m in memberships:
        if m.tenant:
            items.append(
                TenantWithRoleResponse(
                    id=m.tenant.id,
                    name=m.tenant.name,
                    slug=m.tenant.slug,
                    status=m.tenant.status,
                    currency=m.tenant.currency,
                    logo_url=m.tenant.logo_url,
                    created_at=m.tenant.created_at,
                    updated_at=m.tenant.updated_at,
                    role=m.role,
                    is_active=m.is_active,
                )
            )
    return items


@router.post("", response_model=TenantResponse, status_code=status.HTTP_201_CREATED)
async def create_workspace(
    data: TenantCreate,
    current_user: Annotated[User, Depends(get_current_user)],
    request: Request,
    db: Annotated[AsyncSession, Depends(get_db)]
) -> TenantResponse:
    """Create a new workspace and make the user WORKSPACE_OWNER."""
    base_slug = slugify(data.slug or data.name)
    slug = f"{base_slug}-{secrets.token_hex(3)}"

    new_tenant = Tenant(
        name=data.name,
        slug=slug,
        status="TRIAL",
        currency="INR",
    )
    db.add(new_tenant)
    await db.flush()

    membership = TenantMembership(
        tenant_id=new_tenant.id,
        user_id=current_user.id,
        role=Role.WORKSPACE_OWNER.value,
        is_active=True,
    )
    db.add(membership)

    await log_audit_event(
        db=db,
        action="workspace.create",
        tenant_id=new_tenant.id,
        user_id=current_user.id,
        resource_type="tenant",
        resource_id=str(new_tenant.id),
        details={"name": new_tenant.name, "slug": new_tenant.slug},
        request=request,
    )

    await db.commit()
    await db.refresh(new_tenant)

    return TenantResponse.model_validate(new_tenant)


@router.get("/current", response_model=TenantWithRoleResponse)
async def get_current_workspace(
    context: Annotated[TenantContext, Depends(get_current_tenant_context)]
) -> TenantWithRoleResponse:
    """Get metadata for the currently active workspace."""
    return TenantWithRoleResponse(
        id=context.tenant.id,
        name=context.tenant.name,
        slug=context.tenant.slug,
        status=context.tenant.status,
        currency=context.tenant.currency,
        logo_url=context.tenant.logo_url,
        created_at=context.tenant.created_at,
        updated_at=context.tenant.updated_at,
        role=context.role.value,
        is_active=context.membership.is_active if context.membership else True,
    )


@router.patch("/current", response_model=TenantResponse)
async def update_current_workspace(
    data: TenantUpdate,
    context: Annotated[TenantContext, Depends(require_permission(Permission.WORKSPACE_MANAGE))],
    current_user: Annotated[User, Depends(get_current_user)],
    request: Request,
    db: Annotated[AsyncSession, Depends(get_db)]
) -> TenantResponse:
    """Update workspace details (Requires WORKSPACE_MANAGE permission)."""
    tenant = context.tenant

    if data.name is not None:
        tenant.name = data.name
    if data.logo_url is not None:
        tenant.logo_url = data.logo_url
    if data.currency is not None:
        tenant.currency = data.currency

    await log_audit_event(
        db=db,
        action="workspace.update",
        tenant_id=tenant.id,
        user_id=current_user.id,
        resource_type="tenant",
        resource_id=str(tenant.id),
        details={"name": tenant.name},
        request=request,
    )

    await db.commit()
    await db.refresh(tenant)

    return TenantResponse.model_validate(tenant)

