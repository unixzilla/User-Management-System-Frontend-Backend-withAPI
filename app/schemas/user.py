"""User Pydantic schemas for request/response validation."""
from datetime import datetime
from typing import Generic, Optional, TypeVar
from uuid import UUID

from pydantic import BaseModel, EmailStr, Field, ConfigDict, field_serializer, field_validator

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

    password: str = Field(
        ...,
        min_length=10,
        max_length=128,
        description="Password must be at least 10 characters with mixed case, digit, and special character",
    )

    @field_validator("password")
    @classmethod
    def password_complexity(cls, v: str) -> str:
        import re
        if not re.search(r"[A-Z]", v):
            raise ValueError("Password must contain at least one uppercase letter")
        if not re.search(r"[a-z]", v):
            raise ValueError("Password must contain at least one lowercase letter")
        if not re.search(r"\d", v):
            raise ValueError("Password must contain at least one digit")
        if not re.search(r"[!@#$%^&*(),.?\":{}|<>_\-+=\[\]\\;'/`~]", v):
            raise ValueError("Password must contain at least one special character")
        return v


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
    groups: list = []  # Will be serialized to list of group names
    permissions: list = []  # Will be serialized to list of permission names

    @field_serializer("roles")
    def serialize_roles(self, roles: list) -> list[str]:
        """Convert Role objects to list of role names."""
        return [role.name for role in roles] if roles else []

    @field_serializer("groups")
    def serialize_groups(self, groups: list) -> list[str]:
        """Convert Group objects to list of group names."""
        return [group.name for group in groups] if groups else []

    @field_serializer("permissions")
    def serialize_permissions(self, permissions: list) -> list[str]:
        """Collect unique permissions from all direct and group-inherited roles."""
        perm_names: set[str] = set()
        for role in self.roles:
            for perm in role.permissions:
                perm_names.add(perm.name)
        for group in self.groups:
            for role in group.roles:
                for perm in role.permissions:
                    perm_names.add(perm.name)
        return sorted(perm_names)


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
