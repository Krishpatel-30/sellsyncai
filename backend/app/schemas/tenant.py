import uuid
from datetime import datetime
from typing import Optional
from pydantic import BaseModel, ConfigDict, Field


class TenantBase(BaseModel):
    name: str = Field(..., min_length=2, max_length=150)


class TenantCreate(TenantBase):
    slug: Optional[str] = Field(None, min_length=2, max_length=100)


class TenantUpdate(BaseModel):
    name: Optional[str] = Field(None, min_length=2, max_length=150)
    logo_url: Optional[str] = None
    currency: Optional[str] = Field(None, max_length=10)


class TenantResponse(TenantBase):
    id: uuid.UUID
    slug: str
    status: str
    currency: str
    logo_url: Optional[str] = None
    created_at: datetime
    updated_at: datetime

    model_config = ConfigDict(from_attributes=True)


class TenantWithRoleResponse(TenantResponse):
    role: str
    is_active: bool

