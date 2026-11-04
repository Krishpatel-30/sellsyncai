import uuid
from datetime import datetime, timezone
from typing import TYPE_CHECKING, List, Optional
from sqlalchemy import DateTime, ForeignKey, Numeric, String, Text
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.base import Base, GUID, TimestampMixin

if TYPE_CHECKING:
    from app.models.marketplace import MarketplaceConnection
    from app.models.tenant import Tenant


class Order(Base, TimestampMixin):
    __tablename__ = "orders"

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
    marketplace_connection_id: Mapped[Optional[uuid.UUID]] = mapped_column(
        GUID(),
        ForeignKey("marketplace_connections.id", ondelete="SET NULL"),
        nullable=True,
        index=True
    )
    marketplace_code: Mapped[str] = mapped_column(
        String(50),
        nullable=False,
        index=True  # SHOPIFY, WOOCOMMERCE, FLIPKART, MEESHO, etc.
    )
    external_order_id: Mapped[str] = mapped_column(
        String(100),
        nullable=False,
        index=True
    )
    order_number: Mapped[str] = mapped_column(
        String(100),
        nullable=False
    )
    customer_name: Mapped[str] = mapped_column(
        String(150),
        nullable=False
    )
    customer_email: Mapped[Optional[str]] = mapped_column(
        String(255),
        nullable=True
    )
    customer_phone: Mapped[Optional[str]] = mapped_column(
        String(50),
        nullable=True
    )
    total_amount: Mapped[float] = mapped_column(
        Numeric(12, 2),
        nullable=False
    )
    subtotal: Mapped[float] = mapped_column(
        Numeric(12, 2),
        nullable=False
    )
    tax_amount: Mapped[float] = mapped_column(
        Numeric(12, 2),
        default=0.00,
        nullable=False
    )
    discount_amount: Mapped[float] = mapped_column(
        Numeric(12, 2),
        default=0.00,
        nullable=False
    )
    currency: Mapped[str] = mapped_column(
        String(10),
        default="INR",
        nullable=False
    )
    payment_status: Mapped[str] = mapped_column(
        String(50),
        default="PAID",  # PAID, PENDING, FAILED, REFUNDED
        nullable=False
    )
    fulfillment_status: Mapped[str] = mapped_column(
        String(50),
        default="UNFULFILLED",  # UNFULFILLED, PROCESSING, SHIPPED, DELIVERED, RETURNED, CANCELLED
        nullable=False
    )
    order_date: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        default=lambda: datetime.now(timezone.utc),
        nullable=False
    )

    # Relationships
    tenant: Mapped["Tenant"] = relationship("Tenant")
    connection: Mapped[Optional["MarketplaceConnection"]] = relationship("MarketplaceConnection")
    items: Mapped[List["OrderItem"]] = relationship(
        "OrderItem",
        back_populates="order",
        cascade="all, delete-orphan"
    )
    addresses: Mapped[List["OrderAddress"]] = relationship(
        "OrderAddress",
        back_populates="order",
        cascade="all, delete-orphan"
    )


class OrderItem(Base, TimestampMixin):
    __tablename__ = "order_items"

    id: Mapped[uuid.UUID] = mapped_column(
        GUID(),
        primary_key=True,
        default=uuid.uuid4
    )
    order_id: Mapped[uuid.UUID] = mapped_column(
        GUID(),
        ForeignKey("orders.id", ondelete="CASCADE"),
        nullable=False,
        index=True
    )
    variant_id: Mapped[Optional[uuid.UUID]] = mapped_column(
        GUID(),
        nullable=True
    )
    sku: Mapped[str] = mapped_column(
        String(100),
        nullable=False
    )
    title: Mapped[str] = mapped_column(
        String(255),
        nullable=False
    )
    quantity: Mapped[int] = mapped_column(
        Numeric(8, 0),
        nullable=False
    )
    unit_price: Mapped[float] = mapped_column(
        Numeric(12, 2),
        nullable=False
    )
    total_price: Mapped[float] = mapped_column(
        Numeric(12, 2),
        nullable=False
    )

    order: Mapped["Order"] = relationship("Order", back_populates="items")


class OrderAddress(Base, TimestampMixin):
    __tablename__ = "order_addresses"

    id: Mapped[uuid.UUID] = mapped_column(
        GUID(),
        primary_key=True,
        default=uuid.uuid4
    )
    order_id: Mapped[uuid.UUID] = mapped_column(
        GUID(),
        ForeignKey("orders.id", ondelete="CASCADE"),
        nullable=False,
        index=True
    )
    address_type: Mapped[str] = mapped_column(
        String(20),
        default="SHIPPING",  # SHIPPING, BILLING
        nullable=False
    )
    full_name: Mapped[str] = mapped_column(
        String(150),
        nullable=False
    )
    address_line1: Mapped[str] = mapped_column(
        String(255),
        nullable=False
    )
    address_line2: Mapped[Optional[str]] = mapped_column(
        String(255),
        nullable=True
    )
    city: Mapped[str] = mapped_column(
        String(100),
        nullable=False
    )
    state: Mapped[str] = mapped_column(
        String(100),
        nullable=False
    )
    postal_code: Mapped[str] = mapped_column(
        String(20),
        nullable=False
    )
    country: Mapped[str] = mapped_column(
        String(100),
        default="India",
        nullable=False
    )

    order: Mapped["Order"] = relationship("Order", back_populates="addresses")

