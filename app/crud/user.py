"""User CRUD operations."""
from datetime import datetime, timezone
from typing import Optional
from uuid import UUID

from sqlalchemy import select, update, func
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.crud.base import CRUDBase
from app.models.role import Role
from app.models.user import User, user_roles


class CRUDUser(CRUDBase):
    """CRUD operations for User model with role management."""

    def __init__(self):
        super().__init__(User)

    async def get_by_email(self, db: AsyncSession, email: str) -> User | None:
        """Get user by email address."""
        result = await db.execute(
            select(User).where(User.email == email).options(selectinload(User.roles))
        )
        return result.scalar_one_or_none()

    async def get_by_username(
        self, db: AsyncSession, username: str
    ) -> User | None:
        """Get user by username."""
        result = await db.execute(
            select(User).where(User.username == username)
        )
        return result.scalar_one_or_none()

    async def get_with_roles(
        self, db: AsyncSession, user_id: UUID
    ) -> User | None:
        """Get user with roles eagerly loaded."""
        result = await db.execute(
            select(User)
            .where(User.id == user_id)
            .options(selectinload(User.roles))
        )
        return result.scalar_one_or_none()

    async def get_multi_with_roles(
        self,
        db: AsyncSession,
        skip: int = 0,
        limit: int = 100,
        active_only: bool = False,
        search: str | None = None,
    ) -> list[User]:
        """Get multiple users with their roles."""
        query = select(User).options(selectinload(User.roles))

        if active_only:
            query = query.where(User.is_active == True, User.deleted_at == None)

        if search:
            pattern = f"%{search}%"
            query = query.where(
                User.email.ilike(pattern) | User.username.ilike(pattern)
            )

        query = query.offset(skip).limit(limit)
        result = await db.execute(query)
        return result.scalars().all()

    async def count_users(
        self,
        db: AsyncSession,
        *,
        active_only: bool = False,
        search: str | None = None,
    ) -> int:
        """Get total count of users."""
        query = select(func.count()).select_from(User)
        if active_only:
            query = query.where(User.is_active == True, User.deleted_at == None)
        if search:
            pattern = f"%{search}%"
            query = query.where(
                User.email.ilike(pattern) | User.username.ilike(pattern)
            )
        result = await db.execute(query)
        return result.scalar_one()

    async def create_with_password(
        self, db: AsyncSession, *, email: str, username: str, password: str
    ) -> User:
        """Create a new user with hashed password."""
        from app.core.security import hash_password

        hashed = hash_password(password)
        user = User(email=email, username=username, hashed_password=hashed)
        db.add(user)
        await db.flush()
        await db.refresh(user)
        return user

    async def authenticate(
        self, db: AsyncSession, *, email: str, password: str
    ) -> User | None:
        """Authenticate user by email and password."""
        user = await self.get_by_email(db, email)
        if user is None or user.deleted_at is not None:
            return None
        from app.core.security import verify_password
        if not verify_password(password, user.hashed_password):
            return None
        return user

    async def soft_delete(
        self, db: AsyncSession, user_id: UUID
    ) -> bool:
        """Soft delete a user and remove all role assignments."""
        now = datetime.now(timezone.utc)

        # Remove role assignments
        await db.execute(
            user_roles.delete().where(user_roles.c.user_id == user_id)
        )

        # Soft delete user
        result = await db.execute(
            update(User)
            .where(User.id == user_id, User.deleted_at == None)
            .values(
                deleted_at=now,
                is_active=False,
            )
        )
        await db.flush()
        return result.rowcount > 0

    async def assign_role(
        self, db: AsyncSession, *, user_id: UUID, role_id: int
    ) -> bool:
        """Assign a role to a user."""
        # Check if assignment already exists
        existing = await db.execute(
            select(user_roles).where(
                user_roles.c.user_id == user_id,
                user_roles.c.role_id == role_id,
            )
        )
        if existing.first():
            return False

        await db.execute(
            user_roles.insert().values(
                user_id=user_id,
                role_id=role_id,
                assigned_at=datetime.now(timezone.utc),
            )
        )
        await db.flush()
        return True

    async def remove_role(
        self, db: AsyncSession, *, user_id: UUID, role_id: int
    ) -> bool:
        """Remove a role from a user."""
        result = await db.execute(
            user_roles.delete().where(
                user_roles.c.user_id == user_id,
                user_roles.c.role_id == role_id,
            )
        )
        await db.flush()
        return result.rowcount > 0

    async def activate(
        self, db: AsyncSession, user_id: UUID
    ) -> User | None:
        """Reactivate a soft-deleted user."""
        user = await self.get(db, user_id)
        if user and user.deleted_at is not None:
            user.deleted_at = None
            user.is_active = True
            await db.flush()
            await db.refresh(user)
            return user
        return None


user = CRUDUser()
