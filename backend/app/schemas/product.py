import uuid
from datetime import datetime
from typing import List, Optional
from pydantic import BaseModel, ConfigDict, Field


class ProductVariantBase(BaseModel):
    sku: str = Field(..., min_length=2, max_length=100)
    title: str = Field(..., min_length=1, max_length=150)
    size: Optional[str] = None
    color: Optional[str] = None
    material: Optional[str] = None
    barcode: Optional[str] = None
    price: float = Field(..., ge=0)
    stock_quantity: int = Field(default=0, ge=0)


class ProductVariantCreate(ProductVariantBase):
    pass


class ProductVariantResponse(ProductVariantBase):
    id: uuid.UUID
    product_id: uuid.UUID
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)


class ProductImageResponse(BaseModel):
    id: uuid.UUID
    url: str
    alt_text: Optional[str] = None
    position: int
    is_primary: bool

    model_config = ConfigDict(from_attributes=True)


class ProductBase(BaseModel):
    name: str = Field(..., min_length=2, max_length=255)
    sku: str = Field(..., min_length=2, max_length=100)
    description: Optional[str] = None
    brand: Optional[str] = None
    category: str = Field(default="General")
    subcategory: Optional[str] = None
    mrp: float = Field(..., ge=0)
    selling_price: float = Field(..., ge=0)
    purchase_price: Optional[float] = Field(default=0.00, ge=0)
    hsn_code: Optional[str] = Field(default="61091000")
    gst_rate: float = Field(default=18.00, ge=0, le=28)
    weight_kg: Optional[float] = 0.5
    dimensions: Optional[str] = "10x10x5 cm"


class ProductCreate(ProductBase):
    variants: Optional[List[ProductVariantCreate]] = None
    images: Optional[List[str]] = None


class ProductUpdate(BaseModel):
    name: Optional[str] = None
    description: Optional[str] = None
    brand: Optional[str] = None
    category: Optional[str] = None
    subcategory: Optional[str] = None
    mrp: Optional[float] = None
    selling_price: Optional[float] = None
    purchase_price: Optional[float] = None
    hsn_code: Optional[str] = None
    gst_rate: Optional[float] = None
    weight_kg: Optional[float] = None
    dimensions: Optional[str] = None


class ProductResponse(ProductBase):
    id: uuid.UUID
    tenant_id: uuid.UUID
    is_archived: bool
    variant_count: int = 1
    total_stock: int = 0
    created_at: datetime
    updated_at: datetime

    model_config = ConfigDict(from_attributes=True)


class ProductDetailResponse(ProductResponse):
    variants: List[ProductVariantResponse] = []
    images: List[ProductImageResponse] = []


class BulkImportResponse(BaseModel):
    total_imported: int
    errors: List[str] = []

