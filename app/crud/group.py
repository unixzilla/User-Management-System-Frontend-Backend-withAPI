"""UserGroup CRUD operations."""
from uuid import UUID

from sqlalchemy import select, func
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.crud.base import CRUDBase
from app.models.group import UserGroup, user_group_members, user_group_roles
from app.models.role import Role


class CRUDGroup(CRUDBase):
    """CRUD operations for UserGroup model."""

    def __init__(self):
        super().__init__(UserGroup)

    async def get_by_name(self, db: AsyncSession, name: str) -> UserGroup | None:
        result = await db.execute(
            select(UserGroup).where(UserGroup.name == name)
        )
        return result.scalar_one_or_none()

    async def get_with_members(self, db: AsyncSession, group_id: int) -> UserGroup | None:
        result = await db.execute(
            select(UserGroup)
            .where(UserGroup.id == group_id)
            .options(
                selectinload(UserGroup.members),
                selectinload(UserGroup.roles),
            )
        )
        return result.scalar_one_or_none()

    async def get_multi_with_member_counts(
        self, db: AsyncSession, skip: int = 0, limit: int = 100
    ) -> list[tuple[UserGroup, int]]:
        query = (
            select(
                UserGroup,
                func.count(user_group_members.c.user_id).label("member_count"),
            )
            .outerjoin(user_group_members, UserGroup.id == user_group_members.c.user_group_id)
            .group_by(UserGroup.id)
            .offset(skip)
            .limit(limit)
        )
        result = await db.execute(query)
        return [(row[0], row[1]) for row in result.all()]

    async def add_member(
        self, db: AsyncSession, *, group_id: int, user_id: UUID
    ) -> bool:
        existing = await db.execute(
            select(user_group_members).where(
                user_group_members.c.user_group_id == group_id,
                user_group_members.c.user_id == user_id,
            )
        )
        if existing.first():
            return False
        await db.execute(
            user_group_members.insert().values(
                user_group_id=group_id, user_id=user_id
            )
        )
        await db.flush()
        return True

    async def remove_member(
        self, db: AsyncSession, *, group_id: int, user_id: UUID
    ) -> bool:
        result = await db.execute(
            user_group_members.delete().where(
                user_group_members.c.user_group_id == group_id,
                user_group_members.c.user_id == user_id,
            )
        )
        await db.flush()
        return result.rowcount > 0

    async def assign_role(
        self, db: AsyncSession, *, group_id: int, role_id: int
    ) -> bool:
        existing = await db.execute(
            select(user_group_roles).where(
                user_group_roles.c.user_group_id == group_id,
                user_group_roles.c.role_id == role_id,
            )
        )
        if existing.first():
            return False
        await db.execute(
            user_group_roles.insert().values(
                user_group_id=group_id, role_id=role_id
            )
        )
        await db.flush()
        return True

    async def remove_role(
        self, db: AsyncSession, *, group_id: int, role_id: int
    ) -> bool:
        result = await db.execute(
            user_group_roles.delete().where(
                user_group_roles.c.user_group_id == group_id,
                user_group_roles.c.role_id == role_id,
            )
        )
        await db.flush()
        return result.rowcount > 0

    async def get_group_roles(self, db: AsyncSession, group_id: int) -> list[Role]:
        result = await db.execute(
            select(Role)
            .join(user_group_roles, Role.id == user_group_roles.c.role_id)
            .where(user_group_roles.c.user_group_id == group_id)
        )
        return result.scalars().all()


group = CRUDGroup()
