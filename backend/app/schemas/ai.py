import uuid
from datetime import datetime
from typing import Any, Dict, List, Optional
from pydantic import BaseModel, ConfigDict, Field


class GenerateListingRequest(BaseModel):
    product_id: uuid.UUID
    marketplace_code: str = Field(..., description="SHOPIFY, FLIPKART, MEESHO, WOOCOMMERCE, MYNTRA, AJIO")
    focus_keywords: Optional[List[str]] = None
    target_audience: Optional[str] = "Indian retail consumers"


class AIGeneratedListingResponse(BaseModel):
    id: uuid.UUID
    product_id: uuid.UUID
    marketplace_code: str
    title: str
    bullet_points: List[str]
    description: str
    search_terms: List[str]
    attributes: Dict[str, Any]
    is_approved: bool
    model_used: str
    tokens_used: int
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)


class ApproveListingRequest(BaseModel):
    title: Optional[str] = None
    bullet_points: Optional[List[str]] = None
    description: Optional[str] = None
    search_terms: Optional[List[str]] = None
    attributes: Optional[Dict[str, Any]] = None
    is_approved: bool = True

