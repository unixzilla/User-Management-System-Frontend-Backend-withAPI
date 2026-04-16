"""Unit tests for user CRUD operations (mocked)."""
from uuid import uuid4
from unittest.mock import AsyncMock, MagicMock, patch
import pytest

from app.crud.user import user as user_crud
from app.models.user import User
from app.models.role import Role


class TestUserCRUD:
    """Tests for CRUDUser class."""

    @pytest.fixture
    def mock_session(self):
        """Create a mock AsyncSession."""
        session = MagicMock()
        session.execute = AsyncMock()
        session.add = MagicMock()
        session.flush = AsyncMock()
        session.refresh = AsyncMock()
        session.commit = AsyncMock()
        session.rollback = AsyncMock()
        return session

    @pytest.mark.asyncio
    async def test_get_by_email_found(self, mock_session):
        """get_by_email should return user when found."""
        test_email = "test@example.com"
        mock_user = User(
            id=uuid4(),
            email=test_email,
            username="testuser",
            hashed_password="hashed",
        )
        mock_session.execute.return_value.scalar_one_or_none.return_value = mock_user

        result = await user_crud.get_by_email(mock_session, test_email)

        assert result == mock_user
        assert result.email == test_email

    @pytest.mark.asyncio
    async def test_get_by_email_not_found(self, mock_session):
        """get_by_email should return None when user not found."""
        mock_session.execute.return_value.scalar_one_or_none.return_value = None

        result = await user_crud.get_by_email(mock_session, "nonexistent@example.com")

        assert result is None

    @pytest.mark.asyncio
    async def test_create_with_password(self, mock_session):
        """create_with_password should hash password and create user."""
        email = "new@example.com"
        username = "newuser"
        password = "plainpass123"

        # Mock the result after flush
        mock_user = User(
            id=uuid4(),
            email=email,
            username=username,
            hashed_password="hashed_value",
        )
        mock_session.execute.return_value.scalar_one_or_none.return_value = mock_user

        with patch("app.crud.user.hash_password", return_value="hashed_value") as mock_hash:
            result = await user_crud.create_with_password(
                mock_session, email=email, username=username, password=password
            )

            mock_hash.assert_called_once_with(password)
            assert result.email == email
            assert result.username == username

    @pytest.mark.asyncio
    async def test_authenticate_success(self, mock_session):
        """authenticate should return user with correct credentials."""
        email = "user@example.com"
        password = "correctpass"
        hashed = "$2b$12$hashsalt"

        mock_user = User(
            id=uuid4(),
            email=email,
            username="testuser",
            hashed_password=hashed,
            deleted_at=None,
        )
        mock_session.execute.return_value.scalar_one_or_none.return_value = mock_user

        with patch("app.crud.user.verify_password", return_value=True):
            result = await user_crud.authenticate(mock_session, email=email, password=password)

        assert result == mock_user

    @pytest.mark.asyncio
    async def test_authenticate_wrong_password(self, mock_session):
        """authenticate should return None with wrong password."""
        mock_user = User(
            id=uuid4(),
            email="user@example.com",
            username="testuser",
            hashed_password="correct_hash",
            deleted_at=None,
        )
        mock_session.execute.return_value.scalar_one_or_none.return_value = mock_user

        with patch("app.crud.user.verify_password", return_value=False):
            result = await user_crud.authenticate(mock_session, email="user@example.com", password="wrong")
        assert result is None

    @pytest.mark.asyncio
    async def test_authenticate_deleted_user(self, mock_session):
        """authenticate should return None for deleted user."""
        mock_user = User(
            id=uuid4(),
            email="user@example.com",
            username="testuser",
            hashed_password="hash",
            deleted_at="2024-01-01",
        )
        mock_session.execute.return_value.scalar_one_or_none.return_value = mock_user

        with patch("app.crud.user.verify_password", return_value=True):
            result = await user_crud.authenticate(mock_session, email="user@example.com", password="pass")
        assert result is None

    @pytest.mark.asyncio
    async def test_soft_delete(self, mock_session):
        """soft_delete should set deleted_at and is_active, remove roles."""
        user_id = uuid4()
        mock_result = MagicMock()
        mock_result.rowcount = 1
        mock_session.execute.return_value = mock_result

        result = await user_crud.soft_delete(mock_session, user_id)

        assert result is True
        mock_session.execute.assert_called()

    @pytest.mark.asyncio
    async def test_soft_delete_not_found(self, mock_session):
        """soft_delete should return False if user not found."""
        user_id = uuid4()
        mock_result = MagicMock()
        mock_result.rowcount = 0
        mock_session.execute.return_value = mock_result

        result = await user_crud.soft_delete(mock_session, user_id)

        assert result is False

    @pytest.mark.asyncio
    async def test_assign_role_new(self, mock_session):
        """assign_role should insert new role assignment."""
        user_id = uuid4()
        role_id = 1

        # Simulate no existing assignment
        mock_session.execute.return_value.first.return_value = None

        result = await user_crud.assign_role(mock_session, user_id=user_id, role_id=role_id)

        assert result is True
        mock_session.execute.assert_called()

    @pytest.mark.asyncio
    async def test_assign_role_already_exists(self, mock_session):
        """assign_role should return False if role already assigned."""
        mock_session.execute.return_value.first.return_value = MagicMock()  # Assignment exists

        result = await user_crud.assign_role(mock_session, user_id=uuid4(), role_id=1)

        assert result is False

    @pytest.mark.asyncio
    async def test_remove_role(self, mock_session):
        """remove_role should delete role assignment."""
        user_id = uuid4()
        role_id = 1
        mock_result = MagicMock()
        mock_result.rowcount = 1
        mock_session.execute.return_value = mock_result

        result = await user_crud.remove_role(mock_session, user_id=user_id, role_id=role_id)

        assert result is True
