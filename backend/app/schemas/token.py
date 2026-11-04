import uuid
from typing import Optional
from pydantic import BaseModel
from app.schemas.user import UserResponse
from app.schemas.tenant import TenantResponse


class TokenResponse(BaseModel):
    access_token: str
    refresh_token: str
    token_type: str = "bearer"
    expires_in: int
    user: UserResponse
    active_tenant: Optional[TenantResponse] = None
    role: Optional[str] = None


class RefreshTokenRequest(BaseModel):
    refresh_token: str


class SwitchWorkspaceRequest(BaseModel):
    tenant_id: uuid.UUID

