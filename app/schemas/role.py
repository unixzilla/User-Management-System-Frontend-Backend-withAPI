"""Role Pydantic schemas."""
from typing import Optional, Any

from pydantic import BaseModel, Field, ConfigDict, field_validator


class RoleBase(BaseModel):
    """Base role schema."""

    name: str = Field(..., min_length=2, max_length=50)
    description: Optional[str] = Field(None, max_length=255)


class RoleCreate(RoleBase):
    """Schema for creating a role."""

    pass


class RoleUpdate(BaseModel):
    """Schema for updating a role."""

    name: Optional[str] = Field(None, min_length=2, max_length=50)
    description: Optional[str] = Field(None, max_length=255)


class RoleOut(RoleBase):
    """Schema for role response."""

    model_config = ConfigDict(from_attributes=True)

    id: int
    name: str
    description: Optional[str] = None
    permissions: list[str] = []

    @field_validator("permissions", mode="before")
    @classmethod
    def extract_permission_names(cls, v: Any) -> list[str]:
        """Convert Permission ORM objects to permission name strings."""
        if not v:
            return []
        if isinstance(v[0], str):
            return v
        return [p.name for p in v]
