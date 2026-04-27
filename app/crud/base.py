"""Generic CRUD base class with common operations."""
from typing import Any, Generic, TypeVar
from uuid import UUID

from sqlalchemy import select, update, delete
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.models.user import User
from app.models.role import Role

ModelType = TypeVar("ModelType")


class CRUDBase:
    """Generic CRUD operations for SQLAlchemy models."""

    def __init__(self, model: type[ModelType]):
        self.model = model

    async def get(self, db: AsyncSession, id: Any) -> ModelType | None:
        """Get a record by ID."""
        result = await db.execute(select(self.model).where(self.model.id == id))
        return result.scalar_one_or_none()

    async def get_multi(
        self,
        db: AsyncSession,
        skip: int = 0,
        limit: int = 100,
        filters: dict | None = None,
    ) -> list[ModelType]:
        """Get multiple records with pagination and optional filters."""
        query = select(self.model)

        if filters:
            for key, value in filters.items():
                if hasattr(self.model, key):
                    query = query.where(getattr(self.model, key) == value)

        query = query.offset(skip).limit(limit)
        result = await db.execute(query)
        return result.scalars().all()

    async def create(self, db: AsyncSession, obj_in: dict) -> ModelType:
        """Create a new record."""
        db_obj = self.model(**obj_in)
        db.add(db_obj)
        await db.flush()
        await db.refresh(db_obj)
        return db_obj

    async def update(
        self, db: AsyncSession, id: Any, obj_in: dict
    ) -> ModelType | None:
        """Update a record."""
        result = await db.execute(
            update(self.model).where(self.model.id == id).values(**obj_in)
        )
        if result.rowcount == 0:
            return None
        await db.flush()
        return await self.get(db, id)

    async def delete(self, db: AsyncSession, id: Any) -> bool:
        """Hard delete a record."""
        result = await db.execute(delete(self.model).where(self.model.id == id))
        return result.rowcount > 0
