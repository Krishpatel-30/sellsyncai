import uuid
from datetime import datetime
from typing import TYPE_CHECKING, List, Optional
from sqlalchemy import Boolean, DateTime, ForeignKey, String, Text, UniqueConstraint
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.base import Base, GUID, TimestampMixin

if TYPE_CHECKING:
    from app.models.tenant import Tenant


class Marketplace(Base, TimestampMixin):
    __tablename__ = "marketplaces"

    id: Mapped[uuid.UUID] = mapped_column(
        GUID(),
        primary_key=True,
        default=uuid.uuid4
    )
    code: Mapped[str] = mapped_column(
        String(50),
        unique=True,
        index=True,
        nullable=False
    )
    name: Mapped[str] = mapped_column(
        String(100),
        nullable=False
    )
    type: Mapped[str] = mapped_column(
        String(50),
        default="DIRECT_API",  # DIRECT_API, OAUTH2
        nullable=False
    )
    description: Mapped[Optional[str]] = mapped_column(
        String(500),
        nullable=True
    )
    logo_url: Mapped[Optional[str]] = mapped_column(
        String(500),
        nullable=True
    )
    is_active: Mapped[bool] = mapped_column(
        Boolean,
        default=True,
        nullable=False
    )

    connections: Mapped[List["MarketplaceConnection"]] = relationship(
        "MarketplaceConnection",
        back_populates="marketplace",
        cascade="all, delete-orphan"
    )


class MarketplaceConnection(Base, TimestampMixin):
    __tablename__ = "marketplace_connections"

    id: Mapped[uuid.UUID] = mapped_column(
        GUID(),
        primary_key=True,
        default=uuid.uuid4
    )
    tenant_id: Mapped[uuid.UUID] = mapped_column(
        GUID(),
        ForeignKey("tenants.id", ondelete="CASCADE"),
        nullable=False,
        index=True
    )
    marketplace_id: Mapped[uuid.UUID] = mapped_column(
        GUID(),
        ForeignKey("marketplaces.id", ondelete="CASCADE"),
        nullable=False,
        index=True
    )
    account_name: Mapped[str] = mapped_column(
        String(150),
        nullable=False
    )
    store_url: Mapped[Optional[str]] = mapped_column(
        String(255),
        nullable=True
    )
    status: Mapped[str] = mapped_column(
        String(50),
        default="CONNECTED",  # CONNECTED, DISCONNECTED, ERROR, PENDING
        nullable=False
    )
    is_active: Mapped[bool] = mapped_column(
        Boolean,
        default=True,
        nullable=False
    )
    error_message: Mapped[Optional[str]] = mapped_column(
        Text,
        nullable=True
    )
    last_synced_at: Mapped[Optional[datetime]] = mapped_column(
        DateTime(timezone=True),
        nullable=True
    )

    # Relationships
    tenant: Mapped["Tenant"] = relationship("Tenant")
    marketplace: Mapped["Marketplace"] = relationship("Marketplace", back_populates="connections")
    credential: Mapped[Optional["IntegrationCredential"]] = relationship(
        "IntegrationCredential",
        back_populates="connection",
        uselist=False,
        cascade="all, delete-orphan"
    )

    __table_args__ = (
        UniqueConstraint("tenant_id", "marketplace_id", "account_name", name="uq_tenant_marketplace_account"),
    )


class IntegrationCredential(Base, TimestampMixin):
    __tablename__ = "integration_credentials"

    id: Mapped[uuid.UUID] = mapped_column(
        GUID(),
        primary_key=True,
        default=uuid.uuid4
    )
    connection_id: Mapped[uuid.UUID] = mapped_column(
        GUID(),
        ForeignKey("marketplace_connections.id", ondelete="CASCADE"),
        unique=True,
        nullable=False
    )
    encrypted_payload: Mapped[str] = mapped_column(
        Text,
        nullable=False
    )

    connection: Mapped["MarketplaceConnection"] = relationship(
        "MarketplaceConnection",
        back_populates="credential"
    )
