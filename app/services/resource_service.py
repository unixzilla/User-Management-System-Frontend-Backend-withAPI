"""Resource business logic service."""
from typing import Optional
from uuid import UUID

from sqlalchemy.ext.asyncio import AsyncSession

from app.crud.resource import resource as resource_crud
from app.models.resource import Resource
from app.services.audit_service import audit_service
from app.core.exceptions import ConflictError, NotFoundError

PROTECTED_RESOURCES = {"users", "roles", "permissions", "groups", "resources"}

DEFAULT_RESOURCES = [
    {"name": "users", "description": "User management"},
    {"name": "roles", "description": "Role management"},
    {"name": "permissions", "description": "Permission management"},
    {"name": "groups", "description": "User group management"},
    {"name": "resources", "description": "Resource management"},
]


class ResourceService:
    """Business logic for resource operations."""

    def __init__(self):
        self.resource_crud = resource_crud
        self.audit_service = audit_service

    async def create_resource(
        self,
        db: AsyncSession,
        *,
        name: str,
        description: Optional[str] = None,
        actor_id: Optional[UUID] = None,
        ip_address: Optional[str] = None,
        user_agent: Optional[str] = None,
    ) -> Resource:
        existing = await self.resource_crud.get_by_name(db, name)
        if existing:
            raise ConflictError(detail=f"Resource '{name}' already exists")

        resource = await self.resource_crud.create(
            db, {"name": name, "description": description}
        )

        await audit_service.log(
            event_type="resource.created",
            actor_id=actor_id,
            target_id=resource.id,
            target_type="resource",
            payload={"name": name, "description": description},
            ip_address=ip_address,
            user_agent=user_agent,
        )
        return resource

    async def update_resource(
        self,
        db: AsyncSession,
        *,
        resource_id: int,
        name: Optional[str] = None,
        description: Optional[str] = None,
        actor_id: Optional[UUID] = None,
        ip_address: Optional[str] = None,
        user_agent: Optional[str] = None,
    ) -> Resource:
        resource = await self.resource_crud.get(db, resource_id)
        if resource is None:
            raise NotFoundError(detail="Resource not found")
        if resource.name in PROTECTED_RESOURCES:
            raise ConflictError(detail=f"Cannot modify the '{resource.name}' resource")

        update_data = {}
        if name is not None:
            existing = await self.resource_crud.get_by_name(db, name)
            if existing and existing.id != resource_id:
                raise ConflictError(detail=f"Resource '{name}' already exists")
            update_data["name"] = name
        if description is not None:
            update_data["description"] = description

        if not update_data:
            return resource

        updated = await self.resource_crud.update(db, id=resource_id, obj_in=update_data)

        await audit_service.log(
            event_type="resource.updated",
            actor_id=actor_id,
            target_id=resource_id,
            target_type="resource",
            payload=update_data,
            ip_address=ip_address,
            user_agent=user_agent,
        )
        return updated

    async def delete_resource(
        self,
        db: AsyncSession,
        *,
        resource_id: int,
        actor_id: Optional[UUID] = None,
        ip_address: Optional[str] = None,
        user_agent: Optional[str] = None,
    ) -> bool:
        r = await self.resource_crud.get(db, resource_id)
        if r is None:
            return False
        if r.name in PROTECTED_RESOURCES:
            raise ConflictError(detail=f"Cannot delete the '{r.name}' resource")

        success = await self.resource_crud.delete(db, id=resource_id)
        if success:
            await audit_service.log(
                event_type="resource.deleted",
                actor_id=actor_id,
                target_id=resource_id,
                target_type="resource",
                payload={"resource_name": r.name},
                ip_address=ip_address,
                user_agent=user_agent,
            )
        return success

    async def seed_default_resources(self, db: AsyncSession) -> None:
        """Ensure default resources exist (idempotent)."""
        for r in DEFAULT_RESOURCES:
            existing = await self.resource_crud.get_by_name(db, r["name"])
            if not existing:
                await self.resource_crud.create(db, r)


resource_service = ResourceService()
