"""MongoDB error log document schema."""
from datetime import datetime
from typing import Any, Optional
from uuid import UUID

from pydantic import BaseModel, Field


class ErrorLog(BaseModel):
    """MongoDB error log document model."""

    id: Optional[str] = Field(None, alias="_id")
    request_id: str = Field(..., description="Correlation ID for the request")
    timestamp: datetime = Field(default_factory=datetime.utcnow)
    method: str = Field(..., description="HTTP method")
    path: str = Field(..., description="Request path")
    status_code: int = Field(500, description="HTTP status code")
    detail: str = Field("Internal server error", description="User-facing error message")
    exception_type: Optional[str] = Field(None, description="Exception class name")
    exception_message: Optional[str] = Field(None, description="Exception message")
    traceback: Optional[str] = Field(None, description="Full traceback")
    user_id: Optional[UUID] = Field(None, description="Authenticated user ID (if any)")
    ip_address: Optional[str] = Field(None, description="Client IP address")
    user_agent: Optional[str] = Field(None, description="User-Agent header")

    model_config = {
        "populate_by_name": True,
        "arbitrary_types_allowed": True,
    }
