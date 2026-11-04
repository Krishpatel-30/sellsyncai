import uuid
from datetime import datetime, timezone
from typing import Optional, Dict, Any, List
from sqlalchemy import String, Float, Integer, Boolean, DateTime, ForeignKey, JSON, UniqueConstraint
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.base import Base, GUID, TimestampMixin


class SubscriptionPlan(Base, TimestampMixin):
    __tablename__ = "subscription_plans"

    id: Mapped[uuid.UUID] = mapped_column(GUID(), primary_key=True, default=uuid.uuid4)
    code: Mapped[str] = mapped_column(String(50), unique=True, index=True, nullable=False)
    name: Mapped[str] = mapped_column(String(100), nullable=False)
    description: Mapped[str] = mapped_column(String(500), nullable=False)
    
    price_inr_monthly: Mapped[float] = mapped_column(Float, default=0.0, nullable=False)
    price_inr_annual: Mapped[float] = mapped_column(Float, default=0.0, nullable=False)
    
    marketplace_limit: Mapped[int] = mapped_column(Integer, default=1, nullable=False)
    product_limit: Mapped[int] = mapped_column(Integer, default=25, nullable=False)
    user_limit: Mapped[int] = mapped_column(Integer, default=1, nullable=False)
    ai_generation_limit_monthly: Mapped[int] = mapped_column(Integer, default=10, nullable=False)
    
    features: Mapped[Dict[str, Any]] = mapped_column(JSON, default=dict)
    is_active: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)
    display_order: Mapped[int] = mapped_column(Integer, default=0, nullable=False)


class Subscription(Base, TimestampMixin):
    __tablename__ = "subscriptions"

    id: Mapped[uuid.UUID] = mapped_column(GUID(), primary_key=True, default=uuid.uuid4)
    tenant_id: Mapped[uuid.UUID] = mapped_column(GUID(), ForeignKey("tenants.id", ondelete="CASCADE"), index=True, nullable=False)
    plan_id: Mapped[uuid.UUID] = mapped_column(GUID(), ForeignKey("subscription_plans.id"), nullable=False)
    
    # Status: TRIALING, ACTIVE, PAST_DUE, CANCELED, EXPIRED
    status: Mapped[str] = mapped_column(String(50), default="TRIALING", nullable=False)
    billing_cycle: Mapped[str] = mapped_column(String(20), default="MONTHLY", nullable=False)  # MONTHLY, ANNUAL
    
    current_period_start: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False)
    current_period_end: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False)
    trial_ends_at: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True), nullable=True)
    cancel_at_period_end: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)
    
    razorpay_customer_id: Mapped[Optional[str]] = mapped_column(String(100), nullable=True)
    razorpay_subscription_id: Mapped[Optional[str]] = mapped_column(String(100), nullable=True)

    # Relationships
    plan: Mapped["SubscriptionPlan"] = relationship("SubscriptionPlan", lazy="joined")


class UsageQuota(Base, TimestampMixin):
    __tablename__ = "usage_quotas"
    __table_args__ = (
        UniqueConstraint("tenant_id", "period_month", name="uq_tenant_period_month"),
    )

    id: Mapped[uuid.UUID] = mapped_column(GUID(), primary_key=True, default=uuid.uuid4)
    tenant_id: Mapped[uuid.UUID] = mapped_column(GUID(), ForeignKey("tenants.id", ondelete="CASCADE"), index=True, nullable=False)
    period_month: Mapped[str] = mapped_column(String(7), nullable=False)  # "YYYY-MM"
    
    ai_generations_used: Mapped[int] = mapped_column(Integer, default=0, nullable=False)
    marketplace_syncs_run: Mapped[int] = mapped_column(Integer, default=0, nullable=False)


class Payment(Base, TimestampMixin):
    __tablename__ = "payments"

    id: Mapped[uuid.UUID] = mapped_column(GUID(), primary_key=True, default=uuid.uuid4)
    tenant_id: Mapped[uuid.UUID] = mapped_column(GUID(), ForeignKey("tenants.id", ondelete="CASCADE"), index=True, nullable=False)
    subscription_id: Mapped[Optional[uuid.UUID]] = mapped_column(GUID(), ForeignKey("subscriptions.id"), nullable=True)
    plan_id: Mapped[Optional[uuid.UUID]] = mapped_column(GUID(), ForeignKey("subscription_plans.id"), nullable=True)
    
    amount: Mapped[float] = mapped_column(Float, nullable=False)
    currency: Mapped[str] = mapped_column(String(10), default="INR", nullable=False)
    status: Mapped[str] = mapped_column(String(50), default="PENDING", nullable=False)  # PENDING, SUCCESS, FAILED, REFUNDED
    provider: Mapped[str] = mapped_column(String(50), default="RAZORPAY", nullable=False)
    
    razorpay_order_id: Mapped[Optional[str]] = mapped_column(String(100), index=True, nullable=True)
    razorpay_payment_id: Mapped[Optional[str]] = mapped_column(String(100), index=True, nullable=True)
    razorpay_signature: Mapped[Optional[str]] = mapped_column(String(255), nullable=True)
    
    idempotency_key: Mapped[Optional[str]] = mapped_column(String(100), index=True, nullable=True)
    error_message: Mapped[Optional[str]] = mapped_column(String(500), nullable=True)


class Invoice(Base, TimestampMixin):
    __tablename__ = "invoices"

    id: Mapped[uuid.UUID] = mapped_column(GUID(), primary_key=True, default=uuid.uuid4)
    tenant_id: Mapped[uuid.UUID] = mapped_column(GUID(), ForeignKey("tenants.id", ondelete="CASCADE"), index=True, nullable=False)
    payment_id: Mapped[Optional[uuid.UUID]] = mapped_column(GUID(), ForeignKey("payments.id"), nullable=True)
    
    invoice_number: Mapped[str] = mapped_column(String(50), unique=True, index=True, nullable=False)
    customer_name: Mapped[str] = mapped_column(String(150), nullable=False)
    customer_gstin: Mapped[Optional[str]] = mapped_column(String(50), nullable=True)
    customer_address: Mapped[Optional[str]] = mapped_column(String(500), nullable=True)
    
    subtotal: Mapped[float] = mapped_column(Float, nullable=False)
    gst_rate: Mapped[float] = mapped_column(Float, default=18.0, nullable=False)
    cgst_amount: Mapped[float] = mapped_column(Float, default=0.0, nullable=False)
    sgst_amount: Mapped[float] = mapped_column(Float, default=0.0, nullable=False)
    igst_amount: Mapped[float] = mapped_column(Float, default=0.0, nullable=False)
    total_amount: Mapped[float] = mapped_column(Float, nullable=False)
    
    status: Mapped[str] = mapped_column(String(50), default="PAID", nullable=False)
    pdf_url: Mapped[Optional[str]] = mapped_column(String(500), nullable=True)


class Coupon(Base, TimestampMixin):
    __tablename__ = "coupons"

    id: Mapped[uuid.UUID] = mapped_column(GUID(), primary_key=True, default=uuid.uuid4)
    code: Mapped[str] = mapped_column(String(50), unique=True, index=True, nullable=False)
    discount_percent: Mapped[float] = mapped_column(Float, default=0.0, nullable=False)
    discount_amount_inr: Mapped[float] = mapped_column(Float, default=0.0, nullable=False)
    max_redemptions: Mapped[int] = mapped_column(Integer, default=100, nullable=False)
    times_redeemed: Mapped[int] = mapped_column(Integer, default=0, nullable=False)
    valid_until: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True), nullable=True)
    is_active: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)


class PaymentWebhookEvent(Base, TimestampMixin):
    __tablename__ = "payment_webhook_events"

    id: Mapped[uuid.UUID] = mapped_column(GUID(), primary_key=True, default=uuid.uuid4)
    event_id: Mapped[str] = mapped_column(String(100), unique=True, index=True, nullable=False)
    event_type: Mapped[str] = mapped_column(String(100), nullable=False)
    payload: Mapped[Dict[str, Any]] = mapped_column(JSON, default=dict)
    processed: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)
    processed_at: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True), nullable=True)

