import uuid
from typing import TYPE_CHECKING, List, Optional
from sqlalchemy import Boolean, ForeignKey, Numeric, String, Text, Integer
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.base import Base, GUID, TimestampMixin

if TYPE_CHECKING:
    from app.models.tenant import Tenant
    from app.models.inventory import InventoryItem


class Product(Base, TimestampMixin):
    __tablename__ = "products"

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
        String(255),
        nullable=False,
        index=True
    )
    sku: Mapped[str] = mapped_column(
        String(100),
        nullable=False,
        index=True
    )
    description: Mapped[Optional[str]] = mapped_column(
        Text,
        nullable=True
    )
    brand: Mapped[Optional[str]] = mapped_column(
        String(100),
        nullable=True,
        index=True
    )
    category: Mapped[str] = mapped_column(
        String(100),
        nullable=False,
        default="General",
        index=True
    )
    subcategory: Mapped[Optional[str]] = mapped_column(
        String(100),
        nullable=True
    )
    mrp: Mapped[float] = mapped_column(
        Numeric(12, 2),
        nullable=False,
        default=0.00
    )
    selling_price: Mapped[float] = mapped_column(
        Numeric(12, 2),
        nullable=False,
        default=0.00
    )
    purchase_price: Mapped[Optional[float]] = mapped_column(
        Numeric(12, 2),
        nullable=True,
        default=0.00
    )
    hsn_code: Mapped[Optional[str]] = mapped_column(
        String(50),
        nullable=True,
        default="61091000"
    )
    gst_rate: Mapped[float] = mapped_column(
        Numeric(5, 2),
        nullable=False,
        default=18.00  # 18% standard GST
    )
    weight_kg: Mapped[Optional[float]] = mapped_column(
        Numeric(8, 3),
        nullable=True,
        default=0.5
    )
    dimensions: Mapped[Optional[str]] = mapped_column(
        String(100),
        nullable=True,
        default="10x10x5 cm"
    )
    is_archived: Mapped[bool] = mapped_column(
        Boolean,
        default=False,
        nullable=False
    )

    # Relationships
    tenant: Mapped["Tenant"] = relationship("Tenant")
    variants: Mapped[List["ProductVariant"]] = relationship(
        "ProductVariant",
        back_populates="product",
        cascade="all, delete-orphan",
        order_by="ProductVariant.created_at.asc()"
    )
    images: Mapped[List["ProductImage"]] = relationship(
        "ProductImage",
        back_populates="product",
        cascade="all, delete-orphan",
        order_by="ProductImage.position.asc()"
    )


class ProductVariant(Base, TimestampMixin):
    __tablename__ = "product_variants"

    id: Mapped[uuid.UUID] = mapped_column(
        GUID(),
        primary_key=True,
        default=uuid.uuid4
    )
    product_id: Mapped[uuid.UUID] = mapped_column(
        GUID(),
        ForeignKey("products.id", ondelete="CASCADE"),
        nullable=False,
        index=True
    )
    sku: Mapped[str] = mapped_column(
        String(100),
        nullable=False,
        index=True
    )
    title: Mapped[str] = mapped_column(
        String(150),
        nullable=False
    )
    size: Mapped[Optional[str]] = mapped_column(
        String(50),
        nullable=True
    )
    color: Mapped[Optional[str]] = mapped_column(
        String(50),
        nullable=True
    )
    material: Mapped[Optional[str]] = mapped_column(
        String(100),
        nullable=True
    )
    barcode: Mapped[Optional[str]] = mapped_column(
        String(100),
        nullable=True
    )
    price: Mapped[float] = mapped_column(
        Numeric(12, 2),
        nullable=False
    )
    stock_quantity: Mapped[int] = mapped_column(
        Integer,
        default=0,
        nullable=False
    )

    # Relationships
    product: Mapped["Product"] = relationship("Product", back_populates="variants")
    inventory_items: Mapped[List["InventoryItem"]] = relationship(
        "InventoryItem",
        back_populates="variant",
        cascade="all, delete-orphan"
    )


class ProductImage(Base, TimestampMixin):
    __tablename__ = "product_images"

    id: Mapped[uuid.UUID] = mapped_column(
        GUID(),
        primary_key=True,
        default=uuid.uuid4
    )
    product_id: Mapped[uuid.UUID] = mapped_column(
        GUID(),
        ForeignKey("products.id", ondelete="CASCADE"),
        nullable=False,
        index=True
    )
    url: Mapped[str] = mapped_column(
        String(500),
        nullable=False
    )
    alt_text: Mapped[Optional[str]] = mapped_column(
        String(255),
        nullable=True
    )
    position: Mapped[int] = mapped_column(
        Integer,
        default=0,
        nullable=False
    )
    is_primary: Mapped[bool] = mapped_column(
        Boolean,
        default=False,
        nullable=False
    )

    product: Mapped["Product"] = relationship("Product", back_populates="images")

