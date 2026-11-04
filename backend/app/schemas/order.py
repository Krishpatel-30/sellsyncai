import uuid
from datetime import datetime
from typing import List, Optional
from pydantic import BaseModel, ConfigDict, EmailStr, Field


class OrderItemBase(BaseModel):
    sku: str
    title: str
    quantity: int
    unit_price: float
    total_price: float


class OrderItemResponse(OrderItemBase):
    id: uuid.UUID
    variant_id: Optional[uuid.UUID] = None

    model_config = ConfigDict(from_attributes=True)


class OrderAddressResponse(BaseModel):
    id: uuid.UUID
    address_type: str
    full_name: str
    address_line1: str
    city: str
    state: str
    postal_code: str
    country: str

    model_config = ConfigDict(from_attributes=True)


class OrderResponse(BaseModel):
    id: uuid.UUID
    tenant_id: uuid.UUID
    marketplace_code: str
    external_order_id: str
    order_number: str
    customer_name: str
    customer_email: Optional[str] = None
    customer_phone: Optional[str] = None
    total_amount: float
    subtotal: float
    tax_amount: float
    discount_amount: float
    currency: str
    payment_status: str
    fulfillment_status: str
    order_date: datetime
    items_count: int = 1

    model_config = ConfigDict(from_attributes=True)


class OrderDetailResponse(OrderResponse):
    items: List[OrderItemResponse] = []
    addresses: List[OrderAddressResponse] = []


class OrderCreateSimulatedRequest(BaseModel):
    marketplace_code: str = Field(..., description="SHOPIFY, FLIPKART, MEESHO, WOOCOMMERCE")
    customer_name: str = "Priya Patel"
    customer_email: Optional[str] = "priya.patel@example.com"
    customer_phone: Optional[str] = "+91 98765 43210"
    sku: str
    quantity: int = Field(default=1, ge=1)
    shipping_city: str = "Mumbai"
    shipping_state: str = "Maharashtra"

