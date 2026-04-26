"""UserGroup business logic service."""
from typing import Optional
from uuid import UUID

from sqlalchemy.ext.asyncio import AsyncSession

from app.crud.group import group as group_crud
from app.crud.role import role as role_crud
from app.models.group import UserGroup
from app.services.audit_service import audit_service
from app.core.exceptions import ConflictError, NotFoundError


class GroupService:
    """Business logic for user group operations."""

    def __init__(self):
        self.group_crud = group_crud
        self.role_crud = role_crud
        self.audit_service = audit_service

    async def create_group(
        self,
        db: AsyncSession,
        *,
        name: str,
        description: Optional[str] = None,
        actor_id: Optional[UUID] = None,
        ip_address: Optional[str] = None,
        user_agent: Optional[str] = None,
    ) -> UserGroup:
        existing = await self.group_crud.get_by_name(db, name)
        if existing:
            raise ConflictError(detail=f"Group '{name}' already exists")

        group = await self.group_crud.create(db, {"name": name, "description": description})

        await audit_service.log(
            event_type="group.created",
            actor_id=actor_id,
            target_id=group.id,
            target_type="group",
            payload={"name": name, "description": description},
            ip_address=ip_address,
            user_agent=user_agent,
        )
        return group

    async def update_group(
        self,
        db: AsyncSession,
        *,
        group_id: int,
        name: Optional[str] = None,
        description: Optional[str] = None,
        actor_id: Optional[UUID] = None,
        ip_address: Optional[str] = None,
        user_agent: Optional[str] = None,
    ) -> UserGroup:
        group = await self.group_crud.get(db, group_id)
        if group is None:
            raise NotFoundError(detail="Group not found")

        update_data = {}
        if name is not None:
            existing = await self.group_crud.get_by_name(db, name)
            if existing and existing.id != group_id:
                raise ConflictError(detail=f"Group '{name}' already exists")
            update_data["name"] = name
        if description is not None:
            update_data["description"] = description

        if not update_data:
            return group

        updated = await self.group_crud.update(db, id=group_id, obj_in=update_data)

        await audit_service.log(
            event_type="group.updated",
            actor_id=actor_id,
            target_id=group_id,
            target_type="group",
            payload=update_data,
            ip_address=ip_address,
            user_agent=user_agent,
        )
        return updated

    async def delete_group(
        self,
        db: AsyncSession,
        *,
        group_id: int,
        actor_id: Optional[UUID] = None,
        ip_address: Optional[str] = None,
        user_agent: Optional[str] = None,
    ) -> bool:
        g = await self.group_crud.get(db, group_id)
        if g is None:
            return False

        success = await self.group_crud.delete(db, id=group_id)
        if success:
            await audit_service.log(
                event_type="group.deleted",
                actor_id=actor_id,
                target_id=group_id,
                target_type="group",
                payload={"group_name": g.name},
                ip_address=ip_address,
                user_agent=user_agent,
            )
        return success

    async def add_member(
        self,
        db: AsyncSession,
        *,
        group_id: int,
        user_id: UUID,
        actor_id: Optional[UUID] = None,
        ip_address: Optional[str] = None,
        user_agent: Optional[str] = None,
    ) -> bool:
        success = await self.group_crud.add_member(db, group_id=group_id, user_id=user_id)
        if success:
            await audit_service.log(
                event_type="group.member_added",
                actor_id=actor_id,
                target_id=user_id,
                target_type="user",
                payload={"group_id": group_id},
                ip_address=ip_address,
                user_agent=user_agent,
            )
        return success

    async def remove_member(
        self,
        db: AsyncSession,
        *,
        group_id: int,
        user_id: UUID,
        actor_id: Optional[UUID] = None,
        ip_address: Optional[str] = None,
        user_agent: Optional[str] = None,
    ) -> bool:
        success = await self.group_crud.remove_member(db, group_id=group_id, user_id=user_id)
        if success:
            await audit_service.log(
                event_type="group.member_removed",
                actor_id=actor_id,
                target_id=user_id,
                target_type="user",
                payload={"group_id": group_id},
                ip_address=ip_address,
                user_agent=user_agent,
            )
        return success

    async def assign_role_to_group(
        self,
        db: AsyncSession,
        *,
        group_id: int,
        role_id: int,
        actor_id: Optional[UUID] = None,
        ip_address: Optional[str] = None,
        user_agent: Optional[str] = None,
    ) -> bool:
        role = await self.role_crud.get(db, role_id)
        if role is None:
            raise NotFoundError(detail="Role not found")
        success = await self.group_crud.assign_role(db, group_id=group_id, role_id=role_id)
        if success:
            await audit_service.log(
                event_type="group.role_assigned",
                actor_id=actor_id,
                target_id=group_id,
                target_type="group",
                payload={"role_id": role_id, "role_name": role.name},
                ip_address=ip_address,
                user_agent=user_agent,
            )
        return success

    async def remove_role_from_group(
        self,
        db: AsyncSession,
        *,
        group_id: int,
        role_id: int,
        actor_id: Optional[UUID] = None,
        ip_address: Optional[str] = None,
        user_agent: Optional[str] = None,
    ) -> bool:
        success = await self.group_crud.remove_role(db, group_id=group_id, role_id=role_id)
        if success:
            await audit_service.log(
                event_type="group.role_removed",
                actor_id=actor_id,
                target_id=group_id,
                target_type="group",
                payload={"role_id": role_id},
                ip_address=ip_address,
                user_agent=user_agent,
            )
        return success

    async def seed_default_groups(self, db: AsyncSession) -> dict[str, int | None]:
        """Ensure default admin and guest groups exist (idempotent).

        Returns a dict mapping group name to group id.
        """
        from app.crud.role import role as role_crud

        group_ids: dict[str, int | None] = {}

        # Admin group
        admin_group = await self.group_crud.get_by_name(db, "admin")
        if not admin_group:
            admin_group = await self.group_crud.create(
                db, {"name": "admin", "description": "System administrators group"}
            )
        group_ids["admin"] = admin_group.id

        # Assign admin role to admin group
        admin_role = await role_crud.get_by_name(db, "admin")
        if admin_role:
            await self.group_crud.assign_role(db, group_id=admin_group.id, role_id=admin_role.id)

        # Guest group
        guest_group = await self.group_crud.get_by_name(db, "guest")
        if not guest_group:
            guest_group = await self.group_crud.create(
                db, {"name": "guest", "description": "Default guest users group"}
            )
        group_ids["guest"] = guest_group.id

        # Assign guest role to guest group
        guest_role = await role_crud.get_by_name(db, "guest")
        if guest_role:
            await self.group_crud.assign_role(db, group_id=guest_group.id, role_id=guest_role.id)

        return group_ids


group_service = GroupService()
