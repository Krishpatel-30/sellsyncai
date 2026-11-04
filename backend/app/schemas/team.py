import uuid
from datetime import datetime
from typing import Optional
from pydantic import BaseModel, ConfigDict, EmailStr, Field
from app.core.rbac import Role
from app.schemas.user import UserResponse


class InviteMemberRequest(BaseModel):
    email: EmailStr
    role: Role = Field(default=Role.VIEWER)


class UpdateMemberRoleRequest(BaseModel):
    role: Role


class TeamMemberResponse(BaseModel):
    id: uuid.UUID
    tenant_id: uuid.UUID
    user_id: uuid.UUID
    role: str
    is_active: bool
    joined_at: datetime
    user: UserResponse

    model_config = ConfigDict(from_attributes=True)


class InvitationResponse(BaseModel):
    id: uuid.UUID
    tenant_id: uuid.UUID
    email: str
    role: str
    status: str
    expires_at: datetime
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)


class AcceptInvitationRequest(BaseModel):
    token: str

