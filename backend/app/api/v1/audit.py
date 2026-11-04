import uuid
from typing import Annotated, List, Optional
from fastapi import APIRouter, Depends, Query
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.deps import (
    TenantContext,
    require_permission,
)
from app.core.rbac import Permission
from app.db.session import get_db
from app.models.audit import AuditLog
from app.schemas.audit import AuditLogResponse

router = APIRouter(prefix="/audit", tags=["Audit Trail"])


@router.get("", response_model=List[AuditLogResponse])
async def get_audit_trail(
    context: Annotated[TenantContext, Depends(require_permission(Permission.AUDIT_VIEW))],
    db: Annotated[AsyncSession, Depends(get_db)],
    action: Optional[str] = Query(None, description="Filter by action name"),
    limit: int = Query(50, ge=1, le=100),
    offset: int = Query(0, ge=0),
) -> List[AuditLogResponse]:
    """Retrieve security audit events for the active workspace."""
    stmt = select(AuditLog).where(AuditLog.tenant_id == context.tenant.id)

    if action:
        stmt = stmt.where(AuditLog.action == action)

    stmt = stmt.order_by(AuditLog.created_at.desc()).limit(limit).offset(offset)
    res = await db.execute(stmt)
    entries = res.scalars().all()

    return [AuditLogResponse.model_validate(e) for e in entries]

