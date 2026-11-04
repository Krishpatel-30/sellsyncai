import uuid
from datetime import datetime
from typing import Optional
from sqlalchemy import DateTime, Integer, String, Text
from sqlalchemy.orm import Mapped, mapped_column

from app.db.base import Base, GUID, TimestampMixin


class IdempotencyKey(Base, TimestampMixin):
    __tablename__ = "idempotency_keys"

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
    key: Mapped[str] = mapped_column(
        String(255),
        unique=True,
        index=True,
        nullable=False
    )
    status: Mapped[str] = mapped_column(
        String(50),
        default="PENDING",  # PENDING, COMPLETED, FAILED
        nullable=False
    )
    response_code: Mapped[Optional[int]] = mapped_column(
        Integer,
        nullable=True
    )
    response_body: Mapped[Optional[str]] = mapped_column(
        Text,
        nullable=True
    )
    expires_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        nullable=False
    )

