"""Audit logging service - writes to MongoDB asynchronously."""
import asyncio
from datetime import datetime
from typing import Any, Optional, Dict
from uuid import UUID

from motor.motor_asyncio import AsyncIOMotorCollection

from app.db.mongo import get_mongo_collection
from app.models.audit_log import AuditLog


class AuditService:
    """Service for writing audit events to MongoDB."""

    def __init__(self):
        self._collection: Optional[AsyncIOMotorCollection] = None

    def _get_collection(self) -> AsyncIOMotorCollection:
        """Get (or cache) the MongoDB audit collection."""
        if self._collection is None:
            self._collection = get_mongo_collection("audit_logs")
        return self._collection

    async def log(
        self,
        *,
        event_type: str,
        actor_id: Optional[UUID] = None,
        target_id: Optional[UUID] = None,
        target_type: Optional[str] = None,
        payload: Optional[Dict[str, Any]] = None,
        ip_address: Optional[str] = None,
        user_agent: Optional[str] = None,
        timestamp: Optional[datetime] = None,
    ) -> None:
        """
        Write an audit event to MongoDB.

        This is a fire-and-forget operation (non-blocking).
        """
        audit_doc = AuditLog(
            event_type=event_type,
            actor_id=actor_id,
            target_id=target_id,
            target_type=target_type,
            payload=payload or {},
            ip_address=ip_address,
            user_agent=user_agent,
            timestamp=timestamp or datetime.now(),
        ).model_dump(by_alias=True, mode="json")

        # Fire-and-forget: create task but don't await
        asyncio.create_task(self._write_audit(audit_doc))

    async def _write_audit(self, document: Dict[str, Any]) -> None:
        """Actually write the audit document to MongoDB."""
        try:
            collection = self._get_collection()
            await collection.insert_one(document)
        except Exception as e:
            # Log error but don't fail the main request
            print(f"[AUDIT] Failed to write audit log: {e}")

    async def find_by_event_type(
        self, event_type: str, limit: int = 100
    ) -> list[Dict[str, Any]]:
        """Retrieve audit events by event type."""
        collection = self._get_collection()
        cursor = collection.find({"event_type": event_type}).sort("timestamp", -1).limit(limit)
        return await cursor.to_list(length=limit)

    async def find_by_target(
        self, target_id: UUID, target_type: Optional[str] = None
    ) -> list[Dict[str, Any]]:
        """Retrieve audit events for a specific target."""
        collection = self._get_collection()
        query = {"target_id": target_id}
        if target_type:
            query["target_type"] = target_type
        cursor = collection.find(query).sort("timestamp", -1)
        return await cursor.to_list(length=1000)

    async def find_by_actor(
        self, actor_id: UUID, limit: int = 100
    ) -> list[Dict[str, Any]]:
        """Retrieve audit events performed by a specific actor."""
        collection = self._get_collection()
        cursor = collection.find({"actor_id": actor_id}).sort("timestamp", -1).limit(limit)
        return await cursor.to_list(length=limit)


audit_service = AuditService()
