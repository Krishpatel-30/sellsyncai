import uuid
from typing import Any, Dict, Optional
from sqlalchemy import JSON, String
from sqlalchemy.orm import Mapped, mapped_column

from app.db.base import Base, GUID, TimestampMixin


class AuditLog(Base, TimestampMixin):
    __tablename__ = "audit_logs"

    id: Mapped[uuid.UUID] = mapped_column(
        GUID(),
        primary_key=True,
        default=uuid.uuid4
    )
    tenant_id: Mapped[Optional[uuid.UUID]] = mapped_column(
        GUID(),
        nullable=True,
        index=True
    )
    user_id: Mapped[Optional[uuid.UUID]] = mapped_column(
        GUID(),
        nullable=True,
        index=True
    )
    action: Mapped[str] = mapped_column(
        String(100),
        nullable=False,
        index=True
    )
    resource_type: Mapped[Optional[str]] = mapped_column(
        String(100),
        nullable=True
    )
    resource_id: Mapped[Optional[str]] = mapped_column(
        String(255),
        nullable=True
    )
    details: Mapped[Optional[Dict[str, Any]]] = mapped_column(
        JSON,
        nullable=True
    )
    ip_address: Mapped[Optional[str]] = mapped_column(
        String(45),
        nullable=True
    )
    user_agent: Mapped[Optional[str]] = mapped_column(
        String(500),
        nullable=True
    )

