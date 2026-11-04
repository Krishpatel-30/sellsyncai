import uuid
from datetime import datetime
from typing import Optional
from pydantic import BaseModel, ConfigDict, Field


class WarehouseBase(BaseModel):
    name: str = Field(..., min_length=2, max_length=150)
    code: str = Field(..., min_length=2, max_length=50)
    city: Optional[str] = None
    state: Optional[str] = None
    is_default: bool = False


class WarehouseCreate(WarehouseBase):
    pass


class WarehouseResponse(WarehouseBase):
    id: uuid.UUID
    tenant_id: uuid.UUID
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)


class InventoryItemResponse(BaseModel):
    id: uuid.UUID
    tenant_id: uuid.UUID
    warehouse_id: uuid.UUID
    warehouse_name: str
    variant_id: uuid.UUID
    product_name: str
    sku: str
    variant_title: str
    on_hand: int
    reserved: int
    safety_stock: int
    available: int
    is_low_stock: bool
    updated_at: datetime

    model_config = ConfigDict(from_attributes=True)


class StockAdjustmentRequest(BaseModel):
    inventory_item_id: uuid.UUID
    quantity_delta: int = Field(..., description="Positive for addition, negative for reduction")
    change_type: str = Field(default="ADJUSTMENT", description="ADJUSTMENT, PURCHASE, RETURN, DAMAGE")
    reason: Optional[str] = None


class InventoryMovementResponse(BaseModel):
    id: uuid.UUID
    inventory_item_id: uuid.UUID
    change_type: str
    quantity_delta: int
    reason: Optional[str] = None
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)

