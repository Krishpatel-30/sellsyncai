import uuid
from datetime import datetime, timezone
from typing import Dict, Any, Optional, Tuple
from fastapi import HTTPException, status
from sqlalchemy import select, func
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.billing import SubscriptionPlan, Subscription, UsageQuota
from app.models.product import Product
from app.models.marketplace import MarketplaceConnection
from app.models.membership import TenantMembership


class EntitlementService:
    @staticmethod
    async def get_or_create_subscription(db: AsyncSession, tenant_id: uuid.UUID) -> Subscription:
        """
        Retrieves the workspace subscription. If none exists, creates a 14-day Free Trial subscription.
        """
        stmt = (
            select(Subscription)
            .where(Subscription.tenant_id == tenant_id)
            .order_by(Subscription.created_at.desc())
        )
        res = await db.execute(stmt)
        sub = res.scalars().first()
        if sub:
            return sub

        # Fetch FREE_TRIAL plan
        plan_stmt = select(SubscriptionPlan).where(SubscriptionPlan.code == "FREE_TRIAL")
        p_res = await db.execute(plan_stmt)
        trial_plan = p_res.scalars().first()
        
        now = datetime.now(timezone.utc)
        trial_end = datetime.fromtimestamp(now.timestamp() + 14 * 86400, tz=timezone.utc)

        if not trial_plan:
            # Seed default trial plan if not present
            trial_plan = SubscriptionPlan(
                code="FREE_TRIAL",
                name="Free Trial",
                description="14-day free trial with 1 marketplace connection and 25 products",
                price_inr_monthly=0.0,
                price_inr_annual=0.0,
                marketplace_limit=1,
                product_limit=25,
                user_limit=2,
                ai_generation_limit_monthly=15,
                features={"inventory_sync": "basic", "order_management": True, "bulk_import": True},
                display_order=0,
            )
            db.add(trial_plan)
            await db.flush()

        new_sub = Subscription(
            tenant_id=tenant_id,
            plan_id=trial_plan.id,
            status="TRIALING",
            billing_cycle="MONTHLY",
            current_period_start=now,
            current_period_end=trial_end,
            trial_ends_at=trial_end,
            cancel_at_period_end=False,
        )
        db.add(new_sub)
        await db.commit()
        await db.refresh(new_sub)
        return new_sub

    @staticmethod
    def _is_subscription_active(sub: Subscription) -> bool:
        now = datetime.now(timezone.utc)
        period_end = sub.current_period_end
        if period_end.tzinfo is None:
            period_end = period_end.replace(tzinfo=timezone.utc)

        if sub.status in ("ACTIVE", "TRIALING"):
            if now <= period_end:
                return True
        return False

    @classmethod
    async def assert_subscription_valid(cls, db: AsyncSession, tenant_id: uuid.UUID) -> Subscription:
        sub = await cls.get_or_create_subscription(db, tenant_id)
        if not cls._is_subscription_active(sub):
            raise HTTPException(
                status_code=status.HTTP_402_PAYMENT_REQUIRED,
                detail="Your SellSync subscription or free trial has expired. Please upgrade or renew your plan to continue using this feature."
            )
        return sub

    @classmethod
    async def check_product_limit(cls, db: AsyncSession, tenant_id: uuid.UUID, adding_count: int = 1) -> None:
        sub = await cls.assert_subscription_valid(db, tenant_id)
        plan = sub.plan

        count_stmt = select(func.count(Product.id)).where(
            Product.tenant_id == tenant_id,
            Product.is_archived == False
        )
        res = await db.execute(count_stmt)
        current_products = res.scalar() or 0

        if current_products + adding_count > plan.product_limit:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail=f"Product limit reached for plan '{plan.name}' ({current_products}/{plan.product_limit}). Please upgrade your subscription to add more products."
            )

    @classmethod
    async def check_marketplace_limit(cls, db: AsyncSession, tenant_id: uuid.UUID) -> None:
        sub = await cls.assert_subscription_valid(db, tenant_id)
        plan = sub.plan

        count_stmt = select(func.count(MarketplaceConnection.id)).where(
            MarketplaceConnection.tenant_id == tenant_id,
            MarketplaceConnection.is_active == True
        )
        res = await db.execute(count_stmt)
        current_connections = res.scalar() or 0

        if current_connections >= plan.marketplace_limit:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail=f"Marketplace connection limit reached for plan '{plan.name}' ({current_connections}/{plan.marketplace_limit}). Upgrade your plan to link additional stores."
            )

    @classmethod
    async def check_user_limit(cls, db: AsyncSession, tenant_id: uuid.UUID) -> None:
        sub = await cls.assert_subscription_valid(db, tenant_id)
        plan = sub.plan

        count_stmt = select(func.count(TenantMembership.id)).where(
            TenantMembership.tenant_id == tenant_id,
            TenantMembership.is_active == True
        )
        res = await db.execute(count_stmt)
        current_users = res.scalar() or 0

        if current_users >= plan.user_limit:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail=f"Team user limit reached for plan '{plan.name}' ({current_users}/{plan.user_limit}). Upgrade your plan to invite more team members."
            )

    @classmethod
    async def check_ai_generation_limit(cls, db: AsyncSession, tenant_id: uuid.UUID) -> None:
        sub = await cls.assert_subscription_valid(db, tenant_id)
        plan = sub.plan

        now = datetime.now(timezone.utc)
        period_month = now.strftime("%Y-%m")

        quota_stmt = select(UsageQuota).where(
            UsageQuota.tenant_id == tenant_id,
            UsageQuota.period_month == period_month
        )
        res = await db.execute(quota_stmt)
        quota = res.scalars().first()
        used = quota.ai_generations_used if quota else 0

        if used >= plan.ai_generation_limit_monthly:
            raise HTTPException(
                status_code=status.HTTP_429_TOO_MANY_REQUESTS,
                detail=f"Monthly AI listing generation limit ({used}/{plan.ai_generation_limit_monthly}) reached for your '{plan.name}' plan. Upgrade or buy add-on credits to generate more."
            )

    @classmethod
    async def record_ai_generation_usage(cls, db: AsyncSession, tenant_id: uuid.UUID, count: int = 1) -> int:
        now = datetime.now(timezone.utc)
        period_month = now.strftime("%Y-%m")

        quota_stmt = select(UsageQuota).where(
            UsageQuota.tenant_id == tenant_id,
            UsageQuota.period_month == period_month
        )
        res = await db.execute(quota_stmt)
        quota = res.scalars().first()

        if not quota:
            quota = UsageQuota(
                tenant_id=tenant_id,
                period_month=period_month,
                ai_generations_used=count,
                marketplace_syncs_run=0
            )
            db.add(quota)
        else:
            quota.ai_generations_used += count

        await db.commit()
        return quota.ai_generations_used

    @classmethod
    async def get_summary(cls, db: AsyncSession, tenant_id: uuid.UUID) -> Dict[str, Any]:
        sub = await cls.get_or_create_subscription(db, tenant_id)
        plan = sub.plan

        now = datetime.now(timezone.utc)
        period_month = now.strftime("%Y-%m")

        # Products count
        p_res = await db.execute(
            select(func.count(Product.id)).where(Product.tenant_id == tenant_id, Product.is_archived == False)
        )
        products_count = p_res.scalar() or 0

        # Connections count
        c_res = await db.execute(
            select(func.count(MarketplaceConnection.id)).where(
                MarketplaceConnection.tenant_id == tenant_id, MarketplaceConnection.is_active == True
            )
        )
        connections_count = c_res.scalar() or 0

        # Users count
        u_res = await db.execute(
            select(func.count(TenantMembership.id)).where(
                TenantMembership.tenant_id == tenant_id, TenantMembership.is_active == True
            )
        )
        users_count = u_res.scalar() or 0

        # AI quota
        q_res = await db.execute(
            select(UsageQuota).where(
                UsageQuota.tenant_id == tenant_id, UsageQuota.period_month == period_month
            )
        )
        quota = q_res.scalars().first()
        ai_used = quota.ai_generations_used if quota else 0

        # Days remaining
        period_end = sub.current_period_end
        if period_end.tzinfo is None:
            period_end = period_end.replace(tzinfo=timezone.utc)
        days_remaining = max(0, (period_end - now).days)

        is_active = cls._is_subscription_active(sub)

        return {
            "subscription_id": str(sub.id),
            "status": sub.status if is_active else "EXPIRED",
            "is_active": is_active,
            "billing_cycle": sub.billing_cycle,
            "current_period_start": sub.current_period_start.isoformat(),
            "current_period_end": sub.current_period_end.isoformat(),
            "days_remaining": days_remaining,
            "plan": {
                "id": str(plan.id),
                "code": plan.code,
                "name": plan.name,
                "description": plan.description,
                "price_inr_monthly": plan.price_inr_monthly,
                "price_inr_annual": plan.price_inr_annual,
                "marketplace_limit": plan.marketplace_limit,
                "product_limit": plan.product_limit,
                "user_limit": plan.user_limit,
                "ai_generation_limit_monthly": plan.ai_generation_limit_monthly,
                "features": plan.features or {},
            },
            "usage": {
                "products_count": products_count,
                "products_limit": plan.product_limit,
                "marketplaces_count": connections_count,
                "marketplaces_limit": plan.marketplace_limit,
                "users_count": users_count,
                "users_limit": plan.user_limit,
                "ai_generations_used": ai_used,
                "ai_generations_limit": plan.ai_generation_limit_monthly,
            }
        }
