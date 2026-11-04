import uuid
from typing import Annotated, List, Optional
from fastapi import APIRouter, Depends, Query, Request, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.api.deps import TenantContext, get_current_tenant_context, get_current_user, require_permission
from app.core.audit import log_audit_event
from app.core.rbac import Permission
from app.db.session import get_db
from app.models.inventory import InventoryItem, InventoryMovement, Warehouse
from app.models.product import ProductVariant
from app.models.user import User
from app.schemas.inventory import (
    InventoryItemResponse,
    InventoryMovementResponse,
    StockAdjustmentRequest,
    WarehouseResponse,
)
from app.services.inventory_engine import inventory_engine

router = APIRouter(prefix="/inventory", tags=["Atomic Inventory Engine"])


@router.get("/overview", response_model=List[InventoryItemResponse])
async def get_inventory_overview(
    context: Annotated[TenantContext, Depends(require_permission(Permission.INVENTORY_VIEW))],
    db: Annotated[AsyncSession, Depends(get_db)],
    low_stock_only: bool = False,
) -> List[InventoryItemResponse]:
    """Retrieve central warehouse inventory with Available = On Hand - Reserved - Safety Stock."""
    stmt = (
        select(InventoryItem)
        .where(InventoryItem.tenant_id == context.tenant.id)
        .options(
            selectinload(InventoryItem.warehouse),
            selectinload(InventoryItem.variant).selectinload(ProductVariant.product)
        )
        .order_by(InventoryItem.updated_at.desc())
    )
    res = await db.execute(stmt)
    items = res.scalars().all()

    result = []
    for item in items:
        avail = max(0, item.on_hand - item.reserved - item.safety_stock)
        is_low = avail <= item.safety_stock

        if low_stock_only and not is_low:
            continue

        result.append(
            InventoryItemResponse(
                id=item.id,
                tenant_id=item.tenant_id,
                warehouse_id=item.warehouse_id,
                warehouse_name=item.warehouse.name if item.warehouse else "Main Warehouse",
                variant_id=item.variant_id,
                product_name=item.variant.product.name if item.variant and item.variant.product else "Product",
                sku=item.variant.sku if item.variant else "SKU",
                variant_title=item.variant.title if item.variant else "Standard",
                on_hand=item.on_hand,
                reserved=item.reserved,
                safety_stock=item.safety_stock,
                available=avail,
                is_low_stock=is_low,
                updated_at=item.updated_at,
            )
        )
    return result


@router.post("/adjust", response_model=InventoryItemResponse)
async def adjust_stock(
    data: StockAdjustmentRequest,
    context: Annotated[TenantContext, Depends(require_permission(Permission.INVENTORY_MANAGE))],
    current_user: Annotated[User, Depends(get_current_user)],
    request: Request,
    db: Annotated[AsyncSession, Depends(get_db)]
) -> InventoryItemResponse:
    """Manually adjust on-hand inventory quantity and audit movement."""
    item = await inventory_engine.adjust_stock(
        db=db,
        tenant_id=context.tenant.id,
        inventory_item_id=data.inventory_item_id,
        quantity_delta=data.quantity_delta,
        change_type=data.change_type,
        reason=data.reason,
        user_id=current_user.id,
    )

    await log_audit_event(
        db=db,
        action="inventory.adjust",
        tenant_id=context.tenant.id,
        user_id=current_user.id,
        resource_type="inventory_item",
        resource_id=str(item.id),
        details={"delta": data.quantity_delta, "reason": data.reason},
        request=request,
    )

    await db.commit()

    # Re-fetch with relations
    res = await db.execute(
        select(InventoryItem)
        .where(InventoryItem.id == item.id)
        .options(
            selectinload(InventoryItem.warehouse),
            selectinload(InventoryItem.variant).selectinload(ProductVariant.product)
        )
    )
    full_item = res.scalar_one()

    avail = max(0, full_item.on_hand - full_item.reserved - full_item.safety_stock)
    return InventoryItemResponse(
        id=full_item.id,
        tenant_id=full_item.tenant_id,
        warehouse_id=full_item.warehouse_id,
        warehouse_name=full_item.warehouse.name if full_item.warehouse else "Main Warehouse",
        variant_id=full_item.variant_id,
        product_name=full_item.variant.product.name if full_item.variant and full_item.variant.product else "Product",
        sku=full_item.variant.sku if full_item.variant else "SKU",
        variant_title=full_item.variant.title if full_item.variant else "Standard",
        on_hand=full_item.on_hand,
        reserved=full_item.reserved,
        safety_stock=full_item.safety_stock,
        available=avail,
        is_low_stock=avail <= full_item.safety_stock,
        updated_at=full_item.updated_at,
    )


@router.get("/movements", response_model=List[InventoryMovementResponse])
async def list_inventory_movements(
    context: Annotated[TenantContext, Depends(require_permission(Permission.INVENTORY_VIEW))],
    db: Annotated[AsyncSession, Depends(get_db)],
    limit: int = Query(50, ge=1, le=100),
) -> List[InventoryMovementResponse]:
    """Retrieve audit trail of all warehouse inventory movements."""
    res = await db.execute(
        select(InventoryMovement)
        .where(InventoryMovement.tenant_id == context.tenant.id)
        .order_by(InventoryMovement.created_at.desc())
        .limit(limit)
    )
    return [InventoryMovementResponse.model_validate(m) for m in res.scalars().all()]

