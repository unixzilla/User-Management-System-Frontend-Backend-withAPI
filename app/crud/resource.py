"""CRUD operations for Resource."""
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.crud.base import CRUDBase
from app.models.resource import Resource


class CRUDResource(CRUDBase):
    def __init__(self):
        super().__init__(Resource)

    async def get_by_name(self, db: AsyncSession, name: str) -> Resource | None:
        result = await db.execute(select(Resource).where(Resource.name == name))
        return result.scalar_one_or_none()


resource = CRUDResource()
