import secrets
import uuid
from datetime import datetime, timezone
from typing import Annotated, List, Optional
from fastapi import APIRouter, Depends, Query, Request, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.api.deps import TenantContext, get_current_tenant_context, get_current_user, require_permission
from app.core.audit import log_audit_event
from app.core.exceptions import NotFoundException
from app.core.rbac import Permission
from app.db.session import get_db
from app.models.marketplace import MarketplaceConnection
from app.models.order import Order, OrderAddress, OrderItem
from app.models.product import Product, ProductVariant
from app.models.user import User
from app.schemas.order import (
    OrderCreateSimulatedRequest,
    OrderDetailResponse,
    OrderResponse,
)
from app.services.inventory_engine import inventory_engine

router = APIRouter(prefix="/orders", tags=["Unified Order Management"])


@router.get("", response_model=List[OrderResponse])
async def list_orders(
    context: Annotated[TenantContext, Depends(require_permission(Permission.ORDER_VIEW))],
    db: Annotated[AsyncSession, Depends(get_db)],
    marketplace_code: Optional[str] = Query(None),
    status_filter: Optional[str] = Query(None, alias="status"),
    limit: int = Query(50, ge=1, le=100),
    offset: int = Query(0, ge=0),
) -> List[OrderResponse]:
    """Retrieve unified orders from connected Flipkart, Meesho, Shopify, and WooCommerce accounts."""
    stmt = (
        select(Order)
        .where(Order.tenant_id == context.tenant.id)
        .options(selectinload(Order.items))
    )

    if marketplace_code:
        stmt = stmt.where(Order.marketplace_code == marketplace_code.upper())
    if status_filter:
        stmt = stmt.where(Order.fulfillment_status == status_filter.upper())

    stmt = stmt.order_by(Order.order_date.desc()).limit(limit).offset(offset)
    res = await db.execute(stmt)
    orders = res.scalars().all()

    items = []
    for o in orders:
        items.append(
            OrderResponse(
                id=o.id,
                tenant_id=o.tenant_id,
                marketplace_code=o.marketplace_code,
                external_order_id=o.external_order_id,
                order_number=o.order_number,
                customer_name=o.customer_name,
                customer_email=o.customer_email,
                customer_phone=o.customer_phone,
                total_amount=float(o.total_amount),
                subtotal=float(o.subtotal),
                tax_amount=float(o.tax_amount),
                discount_amount=float(o.discount_amount),
                currency=o.currency,
                payment_status=o.payment_status,
                fulfillment_status=o.fulfillment_status,
                order_date=o.order_date,
                items_count=len(o.items),
            )
        )
    return items


@router.get("/{order_id}", response_model=OrderDetailResponse)
async def get_order_detail(
    order_id: uuid.UUID,
    context: Annotated[TenantContext, Depends(require_permission(Permission.ORDER_VIEW))],
    db: Annotated[AsyncSession, Depends(get_db)]
) -> OrderDetailResponse:
    """Retrieve single order details, items breakdown, and shipping address."""
    res = await db.execute(
        select(Order)
        .where(
            Order.id == order_id,
            Order.tenant_id == context.tenant.id
        )
        .options(
            selectinload(Order.items),
            selectinload(Order.addresses)
        )
    )
    o = res.scalar_one_or_none()
    if not o:
        raise NotFoundException("Order", order_id)

    return OrderDetailResponse(
        id=o.id,
        tenant_id=o.tenant_id,
        marketplace_code=o.marketplace_code,
        external_order_id=o.external_order_id,
        order_number=o.order_number,
        customer_name=o.customer_name,
        customer_email=o.customer_email,
        customer_phone=o.customer_phone,
        total_amount=float(o.total_amount),
        subtotal=float(o.subtotal),
        tax_amount=float(o.tax_amount),
        discount_amount=float(o.discount_amount),
        currency=o.currency,
        payment_status=o.payment_status,
        fulfillment_status=o.fulfillment_status,
        order_date=o.order_date,
        items_count=len(o.items),
        items=o.items,
        addresses=o.addresses,
    )


@router.post("/simulate", response_model=OrderDetailResponse, status_code=status.HTTP_201_CREATED)
async def simulate_marketplace_order(
    data: OrderCreateSimulatedRequest,
    context: Annotated[TenantContext, Depends(require_permission(Permission.ORDER_MANAGE))],
    current_user: Annotated[User, Depends(get_current_user)],
    request: Request,
    db: Annotated[AsyncSession, Depends(get_db)]
) -> OrderDetailResponse:
    """Simulate receiving a marketplace order and demonstrate row-locked atomic inventory reservation."""
    # Find matching variant (by variant SKU, product master SKU, or prefix)
    target_sku = data.sku.strip()
    v_res = await db.execute(
        select(ProductVariant)
        .join(ProductVariant.product)
        .where(
            ProductVariant.sku == target_sku,
            Product.tenant_id == context.tenant.id
        )
    )
    variant = v_res.scalar_one_or_none()

    # If not found, check if target_sku is a Master Product SKU
    if not variant:
        p_res = await db.execute(
            select(Product)
            .where(
                Product.sku == target_sku,
                Product.tenant_id == context.tenant.id
            )
            .options(selectinload(Product.variants))
        )
        product = p_res.scalar_one_or_none()
        if product and product.variants:
            variant = product.variants[0]
        else:
            # Check variant prefix match (e.g. target_sku-DEF or target_sku-V1)
            v_pref = await db.execute(
                select(ProductVariant)
                .join(ProductVariant.product)
                .where(
                    ProductVariant.sku.like(f"{target_sku}%"),
                    Product.tenant_id == context.tenant.id
                )
            )
            variant = v_pref.scalars().first()

    if not variant:
        raise NotFoundException("Product Variant with SKU", target_sku)

    # 1. ATOMIC STOCK RESERVATION
    await inventory_engine.reserve_stock_atomic(
        db=db,
        tenant_id=context.tenant.id,
        variant_id=variant.id,
        quantity=data.quantity,
    )

    # 2. CREATE ORDER
    order_num = f"SYNC-{secrets.token_hex(4).upper()}"
    ext_id = f"EXT-{data.marketplace_code[:3]}-{secrets.token_hex(5).upper()}"
    unit_p = float(variant.price)
    subtotal = unit_p * data.quantity
    tax = round(subtotal * 0.18, 2)
    total = subtotal + tax

    order = Order(
        tenant_id=context.tenant.id,
        marketplace_code=data.marketplace_code.upper(),
        external_order_id=ext_id,
        order_number=order_num,
        customer_name=data.customer_name,
        customer_email=data.customer_email,
        customer_phone=data.customer_phone,
        total_amount=total,
        subtotal=subtotal,
        tax_amount=tax,
        discount_amount=0.00,
        currency="INR",
        payment_status="PAID",
        fulfillment_status="PROCESSING",
        order_date=datetime.now(timezone.utc),
    )
    db.add(order)
    await db.flush()

    # Create Order Item
    item = OrderItem(
        order_id=order.id,
        variant_id=variant.id,
        sku=variant.sku,
        title=variant.title,
        quantity=data.quantity,
        unit_price=unit_p,
        total_price=subtotal,
    )
    db.add(item)

    # Create Shipping Address
    addr = OrderAddress(
        order_id=order.id,
        address_type="SHIPPING",
        full_name=data.customer_name,
        address_line1="Plot 42, Sector 18",
        city=data.shipping_city,
        state=data.shipping_state,
        postal_code="400001",
        country="India",
    )
    db.add(addr)

    await log_audit_event(
        db=db,
        action="order.simulate_received",
        tenant_id=context.tenant.id,
        user_id=current_user.id,
        resource_type="order",
        resource_id=str(order.id),
        details={"marketplace": data.marketplace_code, "sku": variant.sku, "qty": data.quantity},
        request=request,
    )

    await db.commit()

    # Re-fetch order
    return await get_order_detail(order.id, context, db)

