"""Role CRUD operations."""
from typing import Optional
from uuid import UUID

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.crud.base import CRUDBase
from app.models.role import Role
from app.models.user import User, user_roles


class CRUDRole(CRUDBase):
    """CRUD operations for Role model."""

    def __init__(self):
        super().__init__(Role)

    async def get_by_name(self, db: AsyncSession, name: str) -> Role | None:
        """Get role by name."""
        result = await db.execute(select(Role).where(Role.name == name))
        return result.scalar_one_or_none()

    async def get_with_users(
        self, db: AsyncSession, role_id: int
    ) -> Role | None:
        """Get role with users eagerly loaded."""
        result = await db.execute(
            select(Role)
            .where(Role.id == role_id)
            .options(selectinload(Role.users))
        )
        return result.scalar_one_or_none()

    async def get_multi_with_user_counts(
        self, db: AsyncSession, skip: int = 0, limit: int = 100
    ) -> list[tuple[Role, int]]:
        """Get roles with user count annotations."""
        from sqlalchemy import func

        query = (
            select(
                Role,
                func.count(user_roles.c.user_id).label("user_count"),
            )
            .outerjoin(user_roles, Role.id == user_roles.c.role_id)
            .group_by(Role.id)
            .offset(skip)
            .limit(limit)
        )
        result = await db.execute(query)
        return [(row[0], row[1]) for row in result.all()]

    async def get_user_roles(self, db: AsyncSession, user_id: UUID) -> list[Role]:
        """Get all roles assigned to a user."""
        result = await db.execute(
            select(Role)
            .join(user_roles, Role.id == user_roles.c.role_id)
            .where(user_roles.c.user_id == user_id)
        )
        return result.scalars().all()


role = CRUDRole()
