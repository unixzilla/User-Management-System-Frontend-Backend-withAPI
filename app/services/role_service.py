"""Role business logic service."""
from typing import Optional, List

from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select

from app.crud.role import role as role_crud
from app.models.role import Role
from app.models.user import User
from app.schemas.role import RoleCreate, RoleUpdate
from app.services.audit_service import audit_service
from app.core.exceptions import ConflictError, NotFoundError

INITIAL_ROLES = ["admin", "editor", "viewer"]


class RoleService:
    """Business logic for role operations."""

    def __init__(self):
        self.role_crud = role_crud
        self.audit_service = audit_service

    async def create_role(
        self,
        db: AsyncSession,
        *,
        name: str,
        description: Optional[str] = None,
        actor_id: Optional[str] = None,
        ip_address: Optional[str] = None,
        user_agent: Optional[str] = None,
    ) -> Role:
        """Create a new role."""
        # Check if role with this name already exists
        existing = await self.role_crud.get_by_name(db, name)
        if existing:
            raise ConflictError(detail=f"Role '{name}' already exists")

        role = await self.role_crud.create(db, {"name": name, "description": description})

        await audit_service.log(
            event_type="role.created",
            actor_id=actor_id,
            target_id=role.id,
            target_type="role",
            payload={"name": name, "description": description},
            ip_address=ip_address,
            user_agent=user_agent,
        )

        return role

    async def delete_role(
        self,
        db: AsyncSession,
        *,
        role_id: int,
        actor_id: Optional[str] = None,
        ip_address: Optional[str] = None,
        user_agent: Optional[str] = None,
    ) -> bool:
        """Delete a role."""
        role = await self.role_crud.get(db, role_id)
        if role is None:
            return False

        # Check if role is assigned to any users
        users_with_role = await self.role_crud.get_with_users(db, role_id)
        if users_with_role and users_with_role.users:
            raise ConflictError(
                detail=f"Cannot delete role '{role.name}': assigned to {len(users_with_role.users)} user(s)"
            )

        success = await self.role_crud.delete(db, id=role_id)

        if success:
            await audit_service.log(
                event_type="role.deleted",
                actor_id=actor_id,
                target_id=role_id,
                target_type="role",
                payload={"role_name": role.name},
                ip_address=ip_address,
                user_agent=user_agent,
            )

        return success

    async def get_multi(self, db: AsyncSession, skip: int = 0, limit: int = 100) -> list[Role]:
        """Get multiple roles."""
        result = await db.execute(select(Role).offset(skip).limit(limit))
        return result.scalars().all()

    async def seed_initial_roles(self, db: AsyncSession) -> None:
        """Ensure the three core roles exist (idempotent)."""
        for role_name in INITIAL_ROLES:
            existing = await self.role_crud.get_by_name(db, role_name)
            if not existing:
                await self.role_crud.create(
                    db,
                    {"name": role_name, "description": f"Can {role_name} operations"},
                )


role_service = RoleService()
