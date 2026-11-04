import uuid
from typing import Any, Dict, Optional
from fastapi import Request
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.audit import AuditLog


async def log_audit_event(
    db: AsyncSession,
    action: str,
    tenant_id: Optional[uuid.UUID] = None,
    user_id: Optional[uuid.UUID] = None,
    resource_type: Optional[str] = None,
    resource_id: Optional[str] = None,
    details: Optional[Dict[str, Any]] = None,
    request: Optional[Request] = None,
) -> AuditLog:
    """Record an audit trail event."""
    ip_address = None
    user_agent = None

    if request:
        client_host = request.client.host if request.client else None
        ip_address = request.headers.get("X-Forwarded-For", client_host)
        user_agent = request.headers.get("User-Agent")

    audit_entry = AuditLog(
        tenant_id=tenant_id,
        user_id=user_id,
        action=action,
        resource_type=resource_type,
        resource_id=resource_id,
        details=details,
        ip_address=ip_address,
        user_agent=user_agent,
    )
    db.add(audit_entry)
    await db.flush()
    return audit_entry

