"""MongoDB audit log document schema (Pydantic)."""
from datetime import datetime
from typing import Any, Optional, Union
from uuid import UUID

from pydantic import BaseModel, Field


class AuditLog(BaseModel):
    """MongoDB audit log document model."""

    id: Optional[str] = Field(None, alias="_id")
    event_type: str = Field(..., description="Type of audit event")
    actor_id: Optional[UUID] = Field(None, description="UUID of the user performing the action")
    target_id: Optional[Union[UUID, int, str]] = Field(None, description="ID of affected resource (UUID for users, int for roles)")
    target_type: Optional[str] = Field(None, description="Type of target: user, role")
    payload: dict[str, Any] = Field(default_factory=dict, description="Event-specific data")
    ip_address: Optional[str] = Field(None, description="IP address of requester")
    user_agent: Optional[str] = Field(None, description="User-Agent header")
    timestamp: datetime = Field(default_factory=lambda: datetime.now())

    model_config = {
        "populate_by_name": True,
        "arbitrary_types_allowed": True,
    }
