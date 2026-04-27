"""Error logging service — writes to MongoDB asynchronously."""
import asyncio
from datetime import datetime
from typing import Optional, Any, Dict
from uuid import UUID

from motor.motor_asyncio import AsyncIOMotorCollection

from app.db.mongo import get_mongo_collection
from app.models.error_log import ErrorLog


class ErrorService:
    """Service for persisting error events to MongoDB."""

    def __init__(self):
        self._collection: Optional[AsyncIOMotorCollection] = None

    def _get_collection(self) -> AsyncIOMotorCollection:
        if self._collection is None:
            self._collection = get_mongo_collection("error_logs")
        return self._collection

    def log_error(
        self,
        *,
        request_id: str,
        method: str,
        path: str,
        status_code: int = 500,
        detail: str = "Internal server error",
        exception_type: Optional[str] = None,
        exception_message: Optional[str] = None,
        traceback_str: Optional[str] = None,
        user_id: Optional[UUID] = None,
        ip_address: Optional[str] = None,
        user_agent: Optional[str] = None,
    ) -> None:
        """Write an error event to MongoDB (fire-and-forget)."""
        doc = ErrorLog(
            request_id=request_id,
            method=method,
            path=path,
            status_code=status_code,
            detail=detail,
            exception_type=exception_type,
            exception_message=exception_message,
            traceback=traceback_str,
            user_id=user_id,
            ip_address=ip_address,
            user_agent=user_agent,
            timestamp=datetime.utcnow(),
        ).model_dump(by_alias=True, mode="json", exclude_none=True)

        asyncio.create_task(self._write_error(doc))

    async def _write_error(self, document: Dict[str, Any]) -> None:
        try:
            collection = self._get_collection()
            await collection.insert_one(document)
        except Exception:
            pass

    async def list_errors(
        self,
        skip: int = 0,
        limit: int = 50,
        search: Optional[str] = None,
    ) -> tuple[list[dict], int]:
        """List errors with pagination and optional search."""
        collection = self._get_collection()
        query = {}
        if search:
            query = {
                "$or": [
                    {"request_id": search},
                    {"path": {"$regex": search, "$options": "i"}},
                    {"exception_type": {"$regex": search, "$options": "i"}},
                    {"detail": {"$regex": search, "$options": "i"}},
                ]
            }

        total = await collection.count_documents(query)
        cursor = collection.find(query).sort("timestamp", -1).skip(skip).limit(limit)
        items = await cursor.to_list(length=limit)
        return items, total

    async def get_error(self, error_id: str) -> Optional[dict]:
        """Get a single error by its MongoDB _id."""
        from bson import ObjectId

        collection = self._get_collection()
        try:
            doc = await collection.find_one({"_id": ObjectId(error_id)})
        except Exception:
            doc = await collection.find_one({"_id": error_id})
        return doc


error_service = ErrorService()
