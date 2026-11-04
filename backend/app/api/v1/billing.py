import uuid
from typing import Dict, Any, List, Optional, Annotated
from fastapi import APIRouter, Depends, HTTPException, status, Request
from pydantic import BaseModel, Field
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.db.session import get_db
from app.api.deps import TenantContext, get_current_tenant_context, require_permission
from app.core.rbac import Permission
from app.services.payment_service import PaymentService
from app.services.entitlement_service import EntitlementService
from app.models.billing import Invoice, Coupon

router = APIRouter(prefix="/billing", tags=["Billing & Subscriptions"])


class CreateOrderRequest(BaseModel):
    plan_code: str
    billing_cycle: str = Field(default="MONTHLY")
    coupon_code: Optional[str] = None


class VerifyPaymentRequest(BaseModel):
    razorpay_order_id: str
    razorpay_payment_id: str
    razorpay_signature: str


class ApplyCouponRequest(BaseModel):
    code: str
    plan_code: str
    billing_cycle: str = "MONTHLY"


@router.get("/plans")
async def get_subscription_plans(
    db: AsyncSession = Depends(get_db)
):
    """
    List all active subscription tiers with feature specifications and pricing.
    """
    plans = await PaymentService.list_plans(db)
    return [
        {
            "id": str(p.id),
            "code": p.code,
            "name": p.name,
            "description": p.description,
            "price_inr_monthly": p.price_inr_monthly,
            "price_inr_annual": p.price_inr_annual,
            "marketplace_limit": p.marketplace_limit,
            "product_limit": p.product_limit,
            "user_limit": p.user_limit,
            "ai_generation_limit_monthly": p.ai_generation_limit_monthly,
            "features": p.features,
            "display_order": p.display_order,
        }
        for p in plans
    ]


@router.get("/subscription")
async def get_current_subscription(
    context: Annotated[TenantContext, Depends(get_current_tenant_context)],
    db: AsyncSession = Depends(get_db)
):
    """
    Returns the workspace's current subscription, plan entitlements, days remaining, and current resource usage.
    """
    summary = await EntitlementService.get_summary(db, context.tenant.id)
    return summary


@router.post("/create-order")
async def create_payment_order(
    req: CreateOrderRequest,
    context: Annotated[TenantContext, Depends(require_permission(Permission.BILLING_MANAGE))],
    db: AsyncSession = Depends(get_db)
):
    """
    Creates a Razorpay payment order for subscription upgrade or renewal.
    """
    order_data = await PaymentService.create_razorpay_order(
        db=db,
        tenant_id=context.tenant.id,
        plan_code=req.plan_code,
        billing_cycle=req.billing_cycle,
        coupon_code=req.coupon_code
    )
    return order_data


@router.post("/verify-payment")
async def verify_payment(
    req: VerifyPaymentRequest,
    context: Annotated[TenantContext, Depends(require_permission(Permission.BILLING_MANAGE))],
    db: AsyncSession = Depends(get_db)
):
    """
    Server-side verification of Razorpay payment signature and immediate activation of subscription.
    """
    result = await PaymentService.verify_payment_and_activate_subscription(
        db=db,
        tenant_id=context.tenant.id,
        razorpay_order_id=req.razorpay_order_id,
        razorpay_payment_id=req.razorpay_payment_id,
        razorpay_signature=req.razorpay_signature
    )
    return result


@router.get("/invoices")
async def list_invoices(
    context: Annotated[TenantContext, Depends(get_current_tenant_context)],
    db: AsyncSession = Depends(get_db)
):
    """
    List all generated GST invoices for the current tenant.
    """
    stmt = select(Invoice).where(Invoice.tenant_id == context.tenant.id).order_by(Invoice.created_at.desc())
    res = await db.execute(stmt)
    invoices = res.scalars().all()
    return [
        {
            "id": str(i.id),
            "invoice_number": i.invoice_number,
            "customer_name": i.customer_name,
            "subtotal": i.subtotal,
            "gst_rate": i.gst_rate,
            "cgst_amount": i.cgst_amount,
            "sgst_amount": i.sgst_amount,
            "igst_amount": i.igst_amount,
            "total_amount": i.total_amount,
            "status": i.status,
            "created_at": i.created_at.isoformat(),
        }
        for i in invoices
    ]


@router.post("/apply-coupon")
async def apply_coupon(
    req: ApplyCouponRequest,
    context: Annotated[TenantContext, Depends(get_current_tenant_context)],
    db: AsyncSession = Depends(get_db)
):
    """
    Validate a promo coupon code and calculate savings.
    """
    c_stmt = select(Coupon).where(Coupon.code == req.code.strip().upper(), Coupon.is_active == True)
    c_res = await db.execute(c_stmt)
    coupon = c_res.scalars().first()
    if not coupon:
        raise HTTPException(status_code=400, detail="Invalid or expired coupon code")

    return {
        "valid": True,
        "code": coupon.code,
        "discount_percent": coupon.discount_percent,
        "discount_amount_inr": coupon.discount_amount_inr,
    }


@router.post("/webhook")
async def razorpay_webhook(
    request: Request,
    db: AsyncSession = Depends(get_db)
):
    """
    Razorpay server-to-server webhook callback with event deduplication and signature verification.
    """
    payload = await request.json()
    event_id = payload.get("event_id") or request.headers.get("X-Razorpay-Event-Id") or str(uuid.uuid4())
    event_type = payload.get("event", "unknown")

    result = await PaymentService.process_webhook(
        db=db,
        event_id=event_id,
        event_type=event_type,
        payload=payload
    )
    return result
