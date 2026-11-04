import uuid
from typing import TYPE_CHECKING, Any, Dict, List, Optional
from sqlalchemy import Boolean, ForeignKey, Integer, JSON, String, Text
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.base import Base, GUID, TimestampMixin

if TYPE_CHECKING:
    from app.models.product import Product
    from app.models.tenant import Tenant


class AIGeneratedListing(Base, TimestampMixin):
    __tablename__ = "ai_generated_listings"

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
    product_id: Mapped[uuid.UUID] = mapped_column(
        GUID(),
        ForeignKey("products.id", ondelete="CASCADE"),
        nullable=False,
        index=True
    )
    marketplace_code: Mapped[str] = mapped_column(
        String(50),
        nullable=False,
        index=True
    )
    title: Mapped[str] = mapped_column(
        String(255),
        nullable=False
    )
    bullet_points: Mapped[List[str]] = mapped_column(
        JSON,
        default=list,
        nullable=False
    )
    description: Mapped[str] = mapped_column(
        Text,
        nullable=False
    )
    search_terms: Mapped[List[str]] = mapped_column(
        JSON,
        default=list,
        nullable=False
    )
    attributes: Mapped[Dict[str, Any]] = mapped_column(
        JSON,
        default=dict,
        nullable=False
    )
    is_approved: Mapped[bool] = mapped_column(
        Boolean,
        default=False,
        nullable=False
    )
    tokens_used: Mapped[int] = mapped_column(
        Integer,
        default=0,
        nullable=False
    )
    model_used: Mapped[str] = mapped_column(
        String(100),
        default="gpt-4o-mini",
        nullable=False
    )

    # Relationships
    tenant: Mapped["Tenant"] = relationship("Tenant")
    product: Mapped["Product"] = relationship("Product")

