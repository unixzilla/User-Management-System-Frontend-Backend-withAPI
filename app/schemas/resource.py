"""Resource Pydantic schemas."""
from typing import Optional
from datetime import datetime

from pydantic import BaseModel, Field, ConfigDict


class ResourceBase(BaseModel):
    """Base resource schema."""

    name: str = Field(..., min_length=1, max_length=50)
    description: Optional[str] = Field(None, max_length=255)


class ResourceCreate(ResourceBase):
    """Schema for creating a resource."""
    pass


class ResourceUpdate(BaseModel):
    """Schema for updating a resource."""

    name: Optional[str] = Field(None, min_length=1, max_length=50)
    description: Optional[str] = Field(None, max_length=255)


class ResourceOut(ResourceBase):
    """Schema for resource response."""

    model_config = ConfigDict(from_attributes=True)

    id: int
    created_at: Optional[datetime] = None
    updated_at: Optional[datetime] = None
