"""Unit tests for AuditService (mocked MongoDB)."""
from datetime import datetime
from unittest.mock import AsyncMock, MagicMock, patch
import pytest

from app.services.audit_service import AuditService
from app.models.audit_log import AuditLog


class TestAuditService:
    """Tests for AuditService fire-and-forget logging."""

    @pytest.fixture
    def mock_collection(self):
        """Create a mock MongoDB collection."""
        collection = AsyncMock()
        collection.insert_one = AsyncMock()
        return collection

    @pytest.fixture
    def audit_service(self, mock_collection):
        """Create audit service with mocked collection."""
        service = AuditService()
        service._collection = mock_collection
        return service

    @pytest.mark.asyncio
    async def test_log_creates_audit_document(self, audit_service, mock_collection):
        """log() should create audit document with correct structure."""
        await audit_service.log(
            event_type="user.created",
            actor_id=uuid4 := __import__('uuid').UUID('12345678-1234-5678-1234-567812345678'),
            target_id=uuid4,
            target_type="user",
            payload={"email": "test@example.com"},
            ip_address="127.0.0.1",
            user_agent="pytest",
        )

        mock_collection.insert_one.assert_called_once()
        doc = mock_collection.insert_one.call_args[0][0]

        assert doc["event_type"] == "user.created"
        assert doc["target_type"] == "user"
        assert doc["payload"]["email"] == "test@example.com"
        assert "timestamp" in doc
        assert "ip_address" in doc
        assert doc["actor_id"] == "12345678-1234-5678-1234-567812345678"

    @pytest.mark.asyncio
    async def test_log_with_null_actor(self, audit_service, mock_collection):
        """log() should handle null actor (public actions)."""
        await audit_service.log(
            event_type="login.failed",
            actor_id=None,
            payload={"attempted_email": "fail@example.com"},
        )

        doc = mock_collection.insert_one.call_args[0][0]
        assert doc["actor_id"] is None
        assert doc["event_type"] == "login.failed"

    @pytest.mark.asyncio
    async def test_log_with_defaults(self, audit_service, mock_collection):
        """log() should use sensible defaults."""
        before = datetime.now()
        await audit_service.log(event_type="user.updated")
        after = datetime.now()

        doc = mock_collection.insert_one.call_args[0][0]
        assert "timestamp" in doc
        # Timestamp should be between before and after
        ts = doc["timestamp"]
        assert isinstance(ts, datetime)
        assert before <= ts <= after

    @pytest.mark.asyncio
    async def test_log_document_structure(self, audit_service, mock_collection):
        """Verify full document structure for completeness."""
        import uuid
        actor = uuid.uuid4()
        target = uuid.uuid4()

        await audit_service.log(
            event_type="role.assigned",
            actor_id=actor,
            target_id=target,
            target_type="user",
            payload={"assigned_role_id": 5, "role_name": "editor"},
            ip_address="192.168.1.1",
            user_agent="curl/7.68.0",
            timestamp=datetime(2025, 4, 16, 12, 0, 0),
        )

        doc = mock_collection.insert_one.call_args[0][0]
        assert doc["_id"] is None  # Will be assigned by MongoDB
        assert doc["event_type"] == "role.assigned"
        assert str(doc["actor_id"]) == str(actor)
        assert str(doc["target_id"]) == str(target)
        assert doc["target_type"] == "user"
        assert doc["payload"]["assigned_role_id"] == 5
        assert doc["ip_address"] == "192.168.1.1"
        assert doc["user_agent"] == "curl/7.68.0"
        assert doc["timestamp"] == datetime(2025, 4, 16, 12, 0, 0)

    @pytest.mark.asyncio
    async def test_find_by_event_type(self, audit_service, mock_collection):
        """find_by_event_type should query MongoDB correctly."""
        mock_cursor = AsyncMock()
        mock_cursor.sort.return_value.limit.return_value.to_list = AsyncMock(
            return_value=[{"event_type": "user.created"}]
        )
        mock_collection.find.return_value = mock_cursor

        results = await audit_service.find_by_event_type("user.created", limit=10)

        mock_collection.find.assert_called_with({"event_type": "user.created"})
        assert len(results) == 1

    @pytest.mark.asyncio
    async def test_find_by_target(self, audit_service, mock_collection):
        """find_by_target should query by target_id."""
        import uuid
        target_id = uuid.uuid4()

        mock_cursor = AsyncMock()
        mock_cursor.sort.return_value.to_list = AsyncMock(return_value=[])
        mock_collection.find.return_value = mock_cursor

        await audit_service.find_by_target(target_id)

        mock_collection.find.assert_called_with({"target_id": target_id})

    @pytest.mark.asyncio
    async def test_find_by_actor(self, audit_service, mock_collection):
        """find_by_actor should query by actor_id."""
        import uuid
        actor_id = uuid.uuid4()

        mock_cursor = AsyncMock()
        mock_cursor.sort.return_value.limit.return_value.to_list = AsyncMock(return_value=[])
        mock_collection.find.return_value = mock_cursor

        await audit_service.find_by_actor(actor_id, limit=50)

        mock_collection.find.assert_called_with({"actor_id": actor_id})
