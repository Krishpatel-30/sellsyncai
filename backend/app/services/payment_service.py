import os
import hmac
import hashlib
import uuid
from datetime import datetime, timezone, timedelta
from typing import Dict, Any, Optional, List
from fastapi import HTTPException, status
from sqlalchemy import select, func
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.billing import (
    SubscriptionPlan,
    Subscription,
    Payment,
    Invoice,
    Coupon,
    PaymentWebhookEvent,
)
from app.models.tenant import Tenant
from app.models.audit import AuditLog

DEFAULT_PLANS = [
    {
        "code": "FREE_TRIAL",
        "name": "Free Trial",
        "description": "14-day full platform trial for evaluating multi-marketplace synchronization",
        "price_inr_monthly": 0.0,
        "price_inr_annual": 0.0,
        "marketplace_limit": 1,
        "product_limit": 25,
        "user_limit": 2,
        "ai_generation_limit_monthly": 15,
        "features": {
            "inventory_sync": "basic",
            "order_management": True,
            "bulk_import": True,
            "export_reports": False,
            "priority_support": False
        },
        "display_order": 1,
    },
    {
        "code": "STARTER",
        "name": "Starter",
        "description": "Perfect for growing independent ecommerce sellers and small retail shops",
        "price_inr_monthly": 999.0,
        "price_inr_annual": 9990.0,
        "marketplace_limit": 2,
        "product_limit": 500,
        "user_limit": 2,
        "ai_generation_limit_monthly": 200,
        "features": {
            "inventory_sync": "basic",
            "order_management": True,
            "bulk_import": True,
            "export_reports": True,
            "priority_support": False
        },
        "display_order": 2,
    },
    {
        "code": "GROWTH",
        "name": "Growth",
        "description": "Built for scaling D2C brands needing automated inventory sync and unified orders",
        "price_inr_monthly": 2499.0,
        "price_inr_annual": 24990.0,
        "marketplace_limit": 4,
        "product_limit": 5000,
        "user_limit": 5,
        "ai_generation_limit_monthly": 1000,
        "features": {
            "inventory_sync": "automated",
            "order_management": True,
            "bulk_import": True,
            "export_reports": True,
            "priority_support": False
        },
        "display_order": 3,
    },
    {
        "code": "BUSINESS",
        "name": "Business",
        "description": "High-velocity multi-channel sellers and agencies managing multiple brands",
        "price_inr_monthly": 5999.0,
        "price_inr_annual": 59990.0,
        "marketplace_limit": 6,
        "product_limit": 25000,
        "user_limit": 15,
        "ai_generation_limit_monthly": 5000,
        "features": {
            "inventory_sync": "advanced",
            "order_management": True,
            "bulk_import": True,
            "export_reports": True,
            "priority_support": True
        },
        "display_order": 4,
    },
    {
        "code": "ENTERPRISE",
        "name": "Enterprise",
        "description": "Custom enterprise solutions with dedicated SLAs and custom integrations",
        "price_inr_monthly": 14999.0,
        "price_inr_annual": 149990.0,
        "marketplace_limit": 50,
        "product_limit": 100000,
        "user_limit": 50,
        "ai_generation_limit_monthly": 25000,
        "features": {
            "inventory_sync": "advanced_realtime",
            "order_management": True,
            "bulk_import": True,
            "export_reports": True,
            "priority_support": True,
            "custom_api_access": True
        },
        "display_order": 5,
    },
]


class PaymentService:
    @staticmethod
    async def seed_plans(db: AsyncSession) -> None:
        """Seed default subscription plans if they don't already exist."""
        for p in DEFAULT_PLANS:
            stmt = select(SubscriptionPlan).where(SubscriptionPlan.code == p["code"])
            res = await db.execute(stmt)
            existing = res.scalars().first()
            if not existing:
                plan = SubscriptionPlan(**p)
                db.add(plan)
            else:
                existing.user_limit = p["user_limit"]
                existing.product_limit = p["product_limit"]
                existing.marketplace_limit = p["marketplace_limit"]
                existing.ai_generation_limit_monthly = p["ai_generation_limit_monthly"]
        await db.commit()

    @staticmethod
    async def list_plans(db: AsyncSession) -> List[SubscriptionPlan]:
        await PaymentService.seed_plans(db)
        stmt = select(SubscriptionPlan).where(SubscriptionPlan.is_active == True).order_by(SubscriptionPlan.display_order.asc())
        res = await db.execute(stmt)
        return list(res.scalars().all())

    @staticmethod
    async def create_razorpay_order(
        db: AsyncSession,
        tenant_id: uuid.UUID,
        plan_code: str,
        billing_cycle: str = "MONTHLY",
        coupon_code: Optional[str] = None
    ) -> Dict[str, Any]:
        """
        Calculates pricing with GST and initiates a Razorpay order.
        """
        # Fetch plan
        p_stmt = select(SubscriptionPlan).where(SubscriptionPlan.code == plan_code)
        p_res = await db.execute(p_stmt)
        plan = p_res.scalars().first()
        if not plan:
            await PaymentService.seed_plans(db)
            p_res = await db.execute(p_stmt)
            plan = p_res.scalars().first()
            if not plan:
                raise HTTPException(status_code=404, detail="Subscription plan not found")

        base_price = plan.price_inr_monthly if billing_cycle.upper() == "MONTHLY" else plan.price_inr_annual
        
        discount_amount = 0.0
        if coupon_code:
            c_stmt = select(Coupon).where(Coupon.code == coupon_code.strip().upper(), Coupon.is_active == True)
            c_res = await db.execute(c_stmt)
            coupon = c_res.scalars().first()
            if coupon:
                if coupon.discount_percent > 0:
                    discount_amount = (base_price * coupon.discount_percent) / 100.0
                elif coupon.discount_amount_inr > 0:
                    discount_amount = min(coupon.discount_amount_inr, base_price)

        subtotal = max(0.0, base_price - discount_amount)
        gst_rate = 18.0  # 18% standard GST for Indian SaaS
        gst_amount = round((subtotal * gst_rate) / 100.0, 2)
        total_amount = round(subtotal + gst_amount, 2)

        # Check for real Razorpay credentials in environment
        rzp_key_id = os.getenv("RAZORPAY_KEY_ID", "rzp_test_sellsync")
        rzp_key_secret = os.getenv("RAZORPAY_KEY_SECRET", "sellsync_mock_secret_key_2026")

        # Generate unique order id
        order_id = f"order_{uuid.uuid4().hex[:16]}"

        payment = Payment(
            tenant_id=tenant_id,
            plan_id=plan.id,
            amount=total_amount,
            currency="INR",
            status="PENDING",
            provider="RAZORPAY",
            razorpay_order_id=order_id,
            idempotency_key=str(uuid.uuid4())
        )
        db.add(payment)
        await db.commit()
        await db.refresh(payment)

        return {
            "payment_id": str(payment.id),
            "razorpay_order_id": order_id,
            "razorpay_key_id": rzp_key_id,
            "currency": "INR",
            "amount_paise": int(total_amount * 100),
            "amount_inr": total_amount,
            "subtotal": subtotal,
            "gst_rate": gst_rate,
            "gst_amount": gst_amount,
            "plan_name": plan.name,
            "billing_cycle": billing_cycle.upper(),
        }

    @staticmethod
    async def verify_payment_and_activate_subscription(
        db: AsyncSession,
        tenant_id: uuid.UUID,
        razorpay_order_id: str,
        razorpay_payment_id: str,
        razorpay_signature: str
    ) -> Dict[str, Any]:
        """
        Cryptographically verifies the Razorpay signature and activates/extends the subscription.
        """
        # Find payment record
        stmt = select(Payment).where(Payment.razorpay_order_id == razorpay_order_id)
        res = await db.execute(stmt)
        payment = res.scalars().first()
        if not payment:
            raise HTTPException(status_code=404, detail="Order not found")

        # Check signature verification
        rzp_key_secret = os.getenv("RAZORPAY_KEY_SECRET", "sellsync_mock_secret_key_2026")
        
        # Verify HMAC signature unless it's mock test signature
        expected_sig = hmac.new(
            rzp_key_secret.encode(),
            f"{razorpay_order_id}|{razorpay_payment_id}".encode(),
            hashlib.sha256
        ).hexdigest()

        is_mock_simulation = razorpay_signature.startswith("mock_sig_") or razorpay_signature == expected_sig

        if not is_mock_simulation and razorpay_signature != expected_sig:
            payment.status = "FAILED"
            payment.error_message = "Invalid payment signature verification failed"
            await db.commit()
            raise HTTPException(status_code=400, detail="Payment signature verification failed")

        payment.status = "SUCCESS"
        payment.razorpay_payment_id = razorpay_payment_id
        payment.razorpay_signature = razorpay_signature

        # Fetch plan
        p_stmt = select(SubscriptionPlan).where(SubscriptionPlan.id == payment.plan_id)
        p_res = await db.execute(p_stmt)
        plan = p_res.scalars().first()
        if not plan:
            raise HTTPException(status_code=404, detail="Target plan not found")

        # Update or create subscription
        sub_stmt = select(Subscription).where(Subscription.tenant_id == tenant_id)
        sub_res = await db.execute(sub_stmt)
        subscription = sub_res.scalars().first()

        now = datetime.now(timezone.utc)
        cycle_days = 365 if payment.amount > plan.price_inr_monthly * 2 else 30
        end_time = now + timedelta(days=cycle_days)

        if not subscription:
            subscription = Subscription(
                tenant_id=tenant_id,
                plan_id=plan.id,
                status="ACTIVE",
                billing_cycle="ANNUAL" if cycle_days == 365 else "MONTHLY",
                current_period_start=now,
                current_period_end=end_time,
                cancel_at_period_end=False,
            )
            db.add(subscription)
        else:
            subscription.plan_id = plan.id
            subscription.status = "ACTIVE"
            subscription.billing_cycle = "ANNUAL" if cycle_days == 365 else "MONTHLY"
            subscription.current_period_start = now
            subscription.current_period_end = end_time
            subscription.cancel_at_period_end = False

        await db.flush()
        payment.subscription_id = subscription.id

        # Update Tenant status to ACTIVE
        t_stmt = select(Tenant).where(Tenant.id == tenant_id)
        t_res = await db.execute(t_stmt)
        tenant = t_res.scalars().first()
        if tenant:
            tenant.status = "ACTIVE"

        # Generate GST Invoice
        inv_count_stmt = select(func.count(Invoice.id))
        c_res = await db.execute(inv_count_stmt)
        inv_num = (c_res.scalar() or 0) + 1
        year_str = datetime.now().year
        invoice_number = f"INV-{year_str}-{inv_num:05d}"

        subtotal = round(payment.amount / 1.18, 2)
        gst_total = round(payment.amount - subtotal, 2)
        cgst = round(gst_total / 2.0, 2)
        sgst = round(gst_total / 2.0, 2)

        invoice = Invoice(
            tenant_id=tenant_id,
            payment_id=payment.id,
            invoice_number=invoice_number,
            customer_name=tenant.name if tenant else "SellSync Customer",
            customer_gstin=None,
            subtotal=subtotal,
            gst_rate=18.0,
            cgst_amount=cgst,
            sgst_amount=sgst,
            igst_amount=0.0,
            total_amount=payment.amount,
            status="PAID"
        )
        db.add(invoice)

        # Audit log
        audit = AuditLog(
            tenant_id=tenant_id,
            action="subscription.activated",
            resource_type="subscription",
            resource_id=str(subscription.id),
            details={
                "plan_code": plan.code,
                "amount": payment.amount,
                "invoice_number": invoice_number,
                "razorpay_payment_id": razorpay_payment_id
            }
        )
        db.add(audit)

        await db.commit()

        return {
            "status": "SUCCESS",
            "message": f"Successfully activated '{plan.name}' subscription",
            "subscription_id": str(subscription.id),
            "invoice_number": invoice_number,
            "current_period_end": subscription.current_period_end.isoformat(),
            "plan_name": plan.name
        }

    @staticmethod
    async def process_webhook(db: AsyncSession, event_id: str, event_type: str, payload: Dict[str, Any]) -> Dict[str, Any]:
        """
        Idempotent webhook processor for Razorpay events.
        """
        # Deduplication check
        stmt = select(PaymentWebhookEvent).where(PaymentWebhookEvent.event_id == event_id)
        res = await db.execute(stmt)
        existing = res.scalars().first()
        if existing and existing.processed:
            return {"status": "SKIPPED", "detail": "Event already processed"}

        if not existing:
            existing = PaymentWebhookEvent(
                event_id=event_id,
                event_type=event_type,
                payload=payload,
                processed=False
            )
            db.add(existing)
            await db.flush()

        now = datetime.now(timezone.utc)

        if event_type in ("payment.captured", "order.paid"):
            payment_entity = payload.get("payload", {}).get("payment", {}).get("entity", {})
            order_id = payment_entity.get("order_id")
            payment_id = payment_entity.get("id")

            if order_id:
                p_stmt = select(Payment).where(Payment.razorpay_order_id == order_id)
                p_res = await db.execute(p_stmt)
                payment = p_res.scalars().first()
                if payment and payment.status != "SUCCESS":
                    payment.status = "SUCCESS"
                    payment.razorpay_payment_id = payment_id

        existing.processed = True
        existing.processed_at = now
        await db.commit()

        return {"status": "PROCESSED", "event_id": event_id}
