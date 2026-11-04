import uuid
from typing import TYPE_CHECKING, List, Optional
from sqlalchemy import String
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.base import Base, GUID, TimestampMixin

if TYPE_CHECKING:
    from app.models.membership import TenantMembership
    from app.models.invitation import WorkspaceInvitation


class Tenant(Base, TimestampMixin):
    __tablename__ = "tenants"

    id: Mapped[uuid.UUID] = mapped_column(
        GUID(),
        primary_key=True,
        default=uuid.uuid4
    )
    name: Mapped[str] = mapped_column(
        String(150),
        nullable=False
    )
    slug: Mapped[str] = mapped_column(
        String(100),
        unique=True,
        index=True,
        nullable=False
    )
    status: Mapped[str] = mapped_column(
        String(50),
        default="TRIAL",  # TRIAL, ACTIVE, SUSPENDED, CANCELLED
        nullable=False
    )
    currency: Mapped[str] = mapped_column(
        String(10),
        default="INR",
        nullable=False
    )
    logo_url: Mapped[Optional[str]] = mapped_column(
        String(500),
        nullable=True
    )

    # Relationships
    memberships: Mapped[List["TenantMembership"]] = relationship(
        "TenantMembership",
        back_populates="tenant",
        cascade="all, delete-orphan"
    )
    invitations: Mapped[List["WorkspaceInvitation"]] = relationship(
        "WorkspaceInvitation",
        back_populates="tenant",
        cascade="all, delete-orphan"
    )

