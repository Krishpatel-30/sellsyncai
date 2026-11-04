import uuid
from typing import TYPE_CHECKING, List, Optional
from sqlalchemy import Boolean, ForeignKey, Integer, String, Text, UniqueConstraint
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.base import Base, GUID, TimestampMixin

if TYPE_CHECKING:
    from app.models.product import ProductVariant
    from app.models.tenant import Tenant


class Warehouse(Base, TimestampMixin):
    __tablename__ = "warehouses"

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
    name: Mapped[str] = mapped_column(
        String(150),
        nullable=False
    )
    code: Mapped[str] = mapped_column(
        String(50),
        nullable=False
    )
    city: Mapped[Optional[str]] = mapped_column(
        String(100),
        nullable=True
    )
    state: Mapped[Optional[str]] = mapped_column(
        String(100),
        nullable=True
    )
    is_default: Mapped[bool] = mapped_column(
        Boolean,
        default=False,
        nullable=False
    )

    items: Mapped[List["InventoryItem"]] = relationship(
        "InventoryItem",
        back_populates="warehouse",
        cascade="all, delete-orphan"
    )

    __table_args__ = (
        UniqueConstraint("tenant_id", "code", name="uq_tenant_warehouse_code"),
    )


class InventoryItem(Base, TimestampMixin):
    __tablename__ = "inventory_items"

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
    warehouse_id: Mapped[uuid.UUID] = mapped_column(
        GUID(),
        ForeignKey("warehouses.id", ondelete="CASCADE"),
        nullable=False,
        index=True
    )
    variant_id: Mapped[uuid.UUID] = mapped_column(
        GUID(),
        ForeignKey("product_variants.id", ondelete="CASCADE"),
        nullable=False,
        index=True
    )
    on_hand: Mapped[int] = mapped_column(
        Integer,
        default=0,
        nullable=False
    )
    reserved: Mapped[int] = mapped_column(
        Integer,
        default=0,
        nullable=False
    )
    safety_stock: Mapped[int] = mapped_column(
        Integer,
        default=5,
        nullable=False
    )

    @property
    def available(self) -> int:
        """Available Stock = On Hand - Reserved - Safety Stock"""
        return max(0, self.on_hand - self.reserved - self.safety_stock)

    # Relationships
    warehouse: Mapped["Warehouse"] = relationship("Warehouse", back_populates="items")
    variant: Mapped["ProductVariant"] = relationship("ProductVariant", back_populates="inventory_items")
    reservations: Mapped[List["InventoryReservation"]] = relationship(
        "InventoryReservation",
        back_populates="inventory_item",
        cascade="all, delete-orphan"
    )
    movements: Mapped[List["InventoryMovement"]] = relationship(
        "InventoryMovement",
        back_populates="inventory_item",
        cascade="all, delete-orphan"
    )

    __table_args__ = (
        UniqueConstraint("warehouse_id", "variant_id", name="uq_warehouse_variant_inventory"),
    )


class InventoryReservation(Base, TimestampMixin):
    __tablename__ = "inventory_reservations"

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
    inventory_item_id: Mapped[uuid.UUID] = mapped_column(
        GUID(),
        ForeignKey("inventory_items.id", ondelete="CASCADE"),
        nullable=False,
        index=True
    )
    order_id: Mapped[Optional[uuid.UUID]] = mapped_column(
        GUID(),
        nullable=True,
        index=True
    )
    quantity: Mapped[int] = mapped_column(
        Integer,
        nullable=False
    )
    status: Mapped[str] = mapped_column(
        String(50),
        default="ACTIVE",  # ACTIVE, RELEASED, FULFILLED
        nullable=False
    )

    inventory_item: Mapped["InventoryItem"] = relationship(
        "InventoryItem",
        back_populates="reservations"
    )


class InventoryMovement(Base, TimestampMixin):
    __tablename__ = "inventory_movements"

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
    inventory_item_id: Mapped[uuid.UUID] = mapped_column(
        GUID(),
        ForeignKey("inventory_items.id", ondelete="CASCADE"),
        nullable=False,
        index=True
    )
    change_type: Mapped[str] = mapped_column(
        String(50),
        nullable=False  # PURCHASE, ADJUSTMENT, SALE, RETURN
    )
    quantity_delta: Mapped[int] = mapped_column(
        Integer,
        nullable=False
    )
    reason: Mapped[Optional[str]] = mapped_column(
        String(255),
        nullable=True
    )
    user_id: Mapped[Optional[uuid.UUID]] = mapped_column(
        GUID(),
        nullable=True
    )

    inventory_item: Mapped["InventoryItem"] = relationship(
        "InventoryItem",
        back_populates="movements"
    )

