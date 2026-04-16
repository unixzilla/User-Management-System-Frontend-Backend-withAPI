"""Token-related Pydantic schemas."""
from datetime import datetime
from typing import Optional
from uuid import UUID

from pydantic import BaseModel, Field


class TokenPair(BaseModel):
    """Response containing both access and refresh tokens."""

    access_token: str
    refresh_token: str
    token_type: str = "bearer"


class TokenPayload(BaseModel):
    """Decoded JWT payload."""

    sub: Optional[UUID] = None
    exp: Optional[datetime] = None
    type: Optional[str] = None


class TokenCreate(BaseModel):
    """Schema for token refresh request."""

    refresh_token: str
