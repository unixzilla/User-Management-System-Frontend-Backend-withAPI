"""Permission CRUD operations."""
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.crud.base import CRUDBase
from app.models.permission import Permission, role_permissions


class CRUDPermission(CRUDBase):
    """CRUD operations for Permission model."""

    def __init__(self):
        super().__init__(Permission)

    async def get_by_name(self, db: AsyncSession, name: str) -> Permission | None:
        result = await db.execute(
            select(Permission).where(Permission.name == name)
        )
        return result.scalar_one_or_none()

    async def get_role_permissions(self, db: AsyncSession, role_id: int) -> list[Permission]:
        result = await db.execute(
            select(Permission)
            .join(role_permissions, Permission.id == role_permissions.c.permission_id)
            .where(role_permissions.c.role_id == role_id)
        )
        return result.scalars().all()

    async def assign_to_role(
        self, db: AsyncSession, *, role_id: int, permission_id: int
    ) -> bool:
        existing = await db.execute(
            select(role_permissions).where(
                role_permissions.c.role_id == role_id,
                role_permissions.c.permission_id == permission_id,
            )
        )
        if existing.first():
            return False
        await db.execute(
            role_permissions.insert().values(
                role_id=role_id, permission_id=permission_id
            )
        )
        await db.flush()
        return True

    async def remove_from_role(
        self, db: AsyncSession, *, role_id: int, permission_id: int
    ) -> bool:
        result = await db.execute(
            role_permissions.delete().where(
                role_permissions.c.role_id == role_id,
                role_permissions.c.permission_id == permission_id,
            )
        )
        await db.flush()
        return result.rowcount > 0

    async def set_role_permissions(
        self, db: AsyncSession, *, role_id: int, permission_ids: list[int]
    ) -> None:
        """Replace all permissions for a role with the given set."""
        await db.execute(
            role_permissions.delete().where(role_permissions.c.role_id == role_id)
        )
        for pid in permission_ids:
            await db.execute(
                role_permissions.insert().values(
                    role_id=role_id, permission_id=pid
                )
            )
        await db.flush()


permission = CRUDPermission()
