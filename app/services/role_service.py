"""Role business logic service."""
from typing import Optional, List

from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func

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

    async def update_role(
        self,
        db: AsyncSession,
        *,
        role_id: int,
        name: Optional[str] = None,
        description: Optional[str] = None,
        actor_id: Optional[str] = None,
        ip_address: Optional[str] = None,
        user_agent: Optional[str] = None,
    ) -> Role:
        """Update an existing role."""
        role = await self.role_crud.get(db, role_id)
        if role is None:
            raise NotFoundError(detail=f"Role with id {role_id} not found")

        update_data = {}
        if name is not None:
            existing = await self.role_crud.get_by_name(db, name)
            if existing and existing.id != role_id:
                raise ConflictError(detail=f"Role '{name}' already exists")
            update_data['name'] = name
        if description is not None:
            update_data['description'] = description

        if not update_data:
            return role

        updated = await self.role_crud.update(db, id=role_id, obj_in=update_data)

        await audit_service.log(
            event_type="role.updated",
            actor_id=actor_id,
            target_id=role_id,
            target_type="role",
            payload=update_data,
            ip_address=ip_address,
            user_agent=user_agent,
        )

        return updated

    async def delete_role(
        self,
        db: AsyncSession,
        *,
        role_id: int,
        actor_id: Optional[str] = None,
        ip_address: Optional[str] = None,
        user_agent: Optional[str] = None,
    ) -> bool:
        """Delete a role, automatically unassigning from users.

        Users who lose their only role will be assigned to 'guest' role.
        Creates 'guest' role if it doesn't exist.
        The 'admin' role cannot be deleted for security reasons.
        """
        from app.crud.user import user as user_crud
        from app.models.user import user_roles

        role = await self.role_crud.get(db, role_id)
        if role is None:
            return False

        # Protect admin role from deletion
        if role.name == "admin":
            raise ConflictError(detail="Cannot delete the 'admin' role")

        # Get all user IDs assigned to this role using direct query (avoids session caching)
        from sqlalchemy import select as sqla_select
        stmt = sqla_select(user_roles.c.user_id).where(user_roles.c.role_id == role_id)
        result = await db.execute(stmt)
        affected_user_ids = [row[0] for row in result.fetchall()]

        # Process each affected user
        for user_id in affected_user_ids:
            # Remove the role from the user
            await user_crud.remove_role(db, user_id=user_id, role_id=role_id)

            # Check how many roles the user has now
            count_stmt = (
                select(func.count(user_roles.c.role_id))
                .where(user_roles.c.user_id == user_id)
            )
            count_result = await db.execute(count_stmt)
            remaining_count = count_result.scalar() or 0

            # If user has no roles left, assign to guest
            if remaining_count == 0:
                guest_role = await self.role_crud.get_by_name(db, "guest")
                if not guest_role:
                    # Create guest role on-demand if it doesn't exist
                    guest_role = await self.role_crud.create(
                        db,
                        {"name": "guest", "description": "Default guest role with minimal access"},
                    )

                # Assign guest role
                await user_crud.assign_role(db, user_id=user_id, role_id=guest_role.id)

                # Log the automatic assignment
                await audit_service.log(
                    event_type="role.assigned",
                    actor_id=actor_id,
                    target_id=user_id,
                    target_type="user",
                    payload={
                        "assigned_role_id": guest_role.id,
                        "role_name": guest_role.name,
                        "reason": f"Role '{role.name}' was deleted",
                    },
                    ip_address=ip_address,
                    user_agent=user_agent,
                )

        # Now delete the role
        success = await self.role_crud.delete(db, id=role_id)

        if success:
            await audit_service.log(
                event_type="role.deleted",
                actor_id=actor_id,
                target_id=role_id,
                target_type="role",
                payload={
                    "role_name": role.name,
                    "affected_users": [str(uid) for uid in affected_user_ids],
                    "auto_assigned_guest": len(affected_user_ids),
                },
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
