import uuid
from datetime import datetime
from typing import Any, Dict, Optional
from pydantic import BaseModel, ConfigDict, Field


class MarketplaceResponse(BaseModel):
    id: uuid.UUID
    code: str
    name: str
    type: str
    description: Optional[str] = None
    logo_url: Optional[str] = None
    is_active: bool

    model_config = ConfigDict(from_attributes=True)


class MarketplaceConnectionCreate(BaseModel):
    marketplace_code: str
    account_name: str = Field(..., min_length=2, max_length=150)
    store_url: Optional[str] = None
    credentials: Dict[str, Any] = Field(..., description="API Keys, Access Tokens or Secrets")


class MarketplaceConnectionUpdate(BaseModel):
    account_name: Optional[str] = None
    store_url: Optional[str] = None
    credentials: Optional[Dict[str, Any]] = None


class MarketplaceConnectionResponse(BaseModel):
    id: uuid.UUID
    tenant_id: uuid.UUID
    marketplace_id: uuid.UUID
    marketplace_code: str
    marketplace_name: str
    account_name: str
    store_url: Optional[str] = None
    status: str
    is_active: bool
    masked_credentials: Dict[str, str] = {}
    error_message: Optional[str] = None
    last_synced_at: Optional[datetime] = None
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)


class TestConnectionResponse(BaseModel):
    success: bool
    message: str
    status: str
    timestamp: datetime

