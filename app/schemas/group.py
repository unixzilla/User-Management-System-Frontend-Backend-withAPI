"""UserGroup Pydantic schemas."""
from typing import Optional
from datetime import datetime

from pydantic import BaseModel, Field, ConfigDict, field_validator


class GroupMemberOut(BaseModel):
    """Lightweight user representation inside a group."""
    model_config = ConfigDict(from_attributes=True)
    id: str
    username: str
    email: str

    @field_validator('id', mode='before')
    @classmethod
    def coerce_id(cls, v: object) -> str:
        return str(v)


class GroupRoleOut(BaseModel):
    """Lightweight role representation inside a group."""
    model_config = ConfigDict(from_attributes=True)
    id: int
    name: str
    description: Optional[str] = None


class UserGroupBase(BaseModel):
    """Base user group schema."""

    name: str = Field(..., min_length=2, max_length=100)
    description: Optional[str] = Field(None, max_length=255)


class UserGroupCreate(UserGroupBase):
    """Schema for creating a user group."""
    pass


class UserGroupUpdate(BaseModel):
    """Schema for updating a user group."""

    name: Optional[str] = Field(None, min_length=2, max_length=100)
    description: Optional[str] = Field(None, max_length=255)


class UserGroupOut(UserGroupBase):
    """Schema for user group response."""

    model_config = ConfigDict(from_attributes=True)
    id: int
    member_count: int = 0
    members: list[GroupMemberOut] = []
    roles: list[GroupRoleOut] = []
    created_at: Optional[datetime] = None
    updated_at: Optional[datetime] = None


class GroupMemberAdd(BaseModel):
    """Schema for adding a member to a group."""
    user_id: str
