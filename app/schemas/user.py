"""User Pydantic schemas for request/response validation."""
from datetime import datetime
from typing import Generic, Optional, TypeVar
from uuid import UUID

from pydantic import BaseModel, EmailStr, Field, ConfigDict, field_serializer

T = TypeVar("T")


class PaginatedResponse(BaseModel, Generic[T]):
    """Generic paginated response wrapper."""
    items: list[T]
    total: int
    skip: int
    limit: int


class UserBase(BaseModel):
    """Base user schema with common fields."""

    email: EmailStr
    username: str = Field(..., min_length=3, max_length=100)
    full_name: Optional[str] = Field(None, max_length=255)


class UserCreate(UserBase):
    """Schema for creating a new user."""

    password: str = Field(..., min_length=8)


class UserLogin(BaseModel):
    """Schema for user login (email + password only, no username required)."""

    email: EmailStr
    password: str = Field(..., min_length=1)


class UserUpdate(BaseModel):
    """Schema for updating user fields."""

    email: Optional[EmailStr] = None
    username: Optional[str] = Field(None, min_length=3, max_length=100)
    full_name: Optional[str] = Field(None, max_length=255)
    password: Optional[str] = Field(None, min_length=8)
    is_active: Optional[bool] = None
    is_verified: Optional[bool] = None


class UserOut(BaseModel):
    """Schema for user response (public fields)."""

    model_config = ConfigDict(from_attributes=True)

    id: UUID
    email: str
    username: str
    full_name: Optional[str] = None
    is_active: bool
    is_verified: bool
    created_at: datetime
    last_login: Optional[datetime] = None
    roles: list = []  # Will be serialized to list of role names

    @field_serializer("roles")
    def serialize_roles(self, roles: list) -> list[str]:
        """Convert Role objects to list of role names."""
        return [role.name for role in roles] if roles else []


class UserInDBBase(UserBase):
    """Base schema for user stored in DB (includes hashed password)."""

    model_config = ConfigDict(from_attributes=True)

    id: UUID
    hashed_password: str
    is_active: bool
    is_verified: bool
    created_at: datetime
    updated_at: datetime
    deleted_at: Optional[datetime] = None
