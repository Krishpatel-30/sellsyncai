import uuid
from typing import Optional, Tuple
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.exceptions import ConflictException, NotFoundException
from app.models.inventory import InventoryItem, InventoryMovement, InventoryReservation, Warehouse


class InventoryEngineService:
    """Atomic Central Inventory Engine enforcing Available = On Hand - Reserved - Safety Stock."""

    async def get_or_create_default_warehouse(
        self,
        db: AsyncSession,
        tenant_id: uuid.UUID
    ) -> Warehouse:
        """Ensure the workspace has a primary fulfillment warehouse."""
        res = await db.execute(
            select(Warehouse).where(
                Warehouse.tenant_id == tenant_id,
                Warehouse.is_default == True
            )
        )
        warehouse = res.scalar_one_or_none()
        if not warehouse:
            warehouse = Warehouse(
                tenant_id=tenant_id,
                name="Central India Fulfillment Center",
                code="WH-MAIN",
                city="Bengaluru",
                state="Karnataka",
                is_default=True,
            )
            db.add(warehouse)
            await db.flush()
        return warehouse

    async def ensure_variant_inventory(
        self,
        db: AsyncSession,
        tenant_id: uuid.UUID,
        warehouse_id: uuid.UUID,
        variant_id: uuid.UUID,
        initial_stock: int = 50,
        safety_stock: int = 5,
    ) -> InventoryItem:
        """Create or return inventory record for a product variant."""
        res = await db.execute(
            select(InventoryItem).where(
                InventoryItem.tenant_id == tenant_id,
                InventoryItem.warehouse_id == warehouse_id,
                InventoryItem.variant_id == variant_id,
            )
        )
        item = res.scalar_one_or_none()
        if not item:
            item = InventoryItem(
                tenant_id=tenant_id,
                warehouse_id=warehouse_id,
                variant_id=variant_id,
                on_hand=initial_stock,
                reserved=0,
                safety_stock=safety_stock,
            )
            db.add(item)
            await db.flush()

            # Record initial movement
            movement = InventoryMovement(
                tenant_id=tenant_id,
                inventory_item_id=item.id,
                change_type="PURCHASE",
                quantity_delta=initial_stock,
                reason="Initial product creation stock entry",
            )
            db.add(movement)
            await db.flush()
        return item

    async def adjust_stock(
        self,
        db: AsyncSession,
        tenant_id: uuid.UUID,
        inventory_item_id: uuid.UUID,
        quantity_delta: int,
        change_type: str = "ADJUSTMENT",
        reason: Optional[str] = None,
        user_id: Optional[uuid.UUID] = None,
    ) -> InventoryItem:
        """Manually adjust on-hand stock and record movement audit."""
        res = await db.execute(
            select(InventoryItem)
            .where(
                InventoryItem.id == inventory_item_id,
                InventoryItem.tenant_id == tenant_id
            )
            .with_for_update()
        )
        item = res.scalar_one_or_none()
        if not item:
            raise NotFoundException("Inventory item", inventory_item_id)

        new_on_hand = item.on_hand + quantity_delta
        if new_on_hand < 0:
            raise ConflictException(f"Cannot reduce stock below zero. Current physical: {item.on_hand}")

        item.on_hand = new_on_hand

        movement = InventoryMovement(
            tenant_id=tenant_id,
            inventory_item_id=item.id,
            change_type=change_type,
            quantity_delta=quantity_delta,
            reason=reason or "Manual stock adjustment",
            user_id=user_id,
        )
        db.add(movement)
        await db.flush()
        return item

    async def reserve_stock_atomic(
        self,
        db: AsyncSession,
        tenant_id: uuid.UUID,
        variant_id: uuid.UUID,
        quantity: int,
        order_id: Optional[uuid.UUID] = None
    ) -> Tuple[InventoryItem, InventoryReservation]:
        """Atomically lock inventory row and reserve quantity using Available = On Hand - Reserved - Safety Stock."""
        res = await db.execute(
            select(InventoryItem)
            .where(
                InventoryItem.tenant_id == tenant_id,
                InventoryItem.variant_id == variant_id,
            )
            .with_for_update()
        )
        item = res.scalar_one_or_none()
        if not item:
            raise NotFoundException("Inventory item for variant", variant_id)

        available_stock = item.on_hand - item.reserved - item.safety_stock
        if available_stock < quantity:
            raise ConflictException(
                f"Overselling prevention: insufficient available stock for SKU. "
                f"On Hand: {item.on_hand}, Reserved: {item.reserved}, Safety Stock: {item.safety_stock}, Available: {available_stock}, Requested: {quantity}"
            )

        # Atomic reservation
        item.reserved += quantity

        reservation = InventoryReservation(
            tenant_id=tenant_id,
            inventory_item_id=item.id,
            order_id=order_id,
            quantity=quantity,
            status="ACTIVE",
        )
        db.add(reservation)
        await db.flush()

        return item, reservation


inventory_engine = InventoryEngineService()

