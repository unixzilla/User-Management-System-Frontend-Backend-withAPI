"""Permission business logic service."""
from typing import Optional
from uuid import UUID

from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, text

from app.crud.permission import permission as permission_crud
from app.crud.role import role as role_crud
from app.crud.resource import resource as resource_crud
from app.models.permission import Permission, role_permissions
from app.models.role import Role
from app.schemas.permission import PermissionCreate, PermissionUpdate
from app.services.audit_service import audit_service
from app.core.exceptions import ConflictError, NotFoundError

DEFAULT_PERMISSIONS = [
    {"name": "users.read", "description": "View user list and details", "resource": "users", "action": "read"},
    {"name": "users.write", "description": "Create and update users", "resource": "users", "action": "write"},
    {"name": "users.delete", "description": "Delete users", "resource": "users", "action": "delete"},
    {"name": "roles.read", "description": "View roles", "resource": "roles", "action": "read"},
    {"name": "roles.write", "description": "Create and update roles", "resource": "roles", "action": "write"},
    {"name": "roles.delete", "description": "Delete roles", "resource": "roles", "action": "delete"},
    {"name": "permissions.read", "description": "View permissions and resources", "resource": "permissions", "action": "read"},
    {"name": "permissions.write", "description": "Manage permissions", "resource": "permissions", "action": "write"},
    {"name": "permissions.delete", "description": "Delete permissions and resources", "resource": "permissions", "action": "delete"},
    {"name": "resources.read", "description": "View resources", "resource": "resources", "action": "read"},
    {"name": "resources.write", "description": "Create and update resources", "resource": "resources", "action": "write"},
    {"name": "resources.delete", "description": "Delete resources", "resource": "resources", "action": "delete"},
    {"name": "groups.read", "description": "View user groups", "resource": "groups", "action": "read"},
    {"name": "groups.write", "description": "Create and update groups", "resource": "groups", "action": "write"},
    {"name": "groups.delete", "description": "Delete groups", "resource": "groups", "action": "delete"},
    {"name": "admin", "description": "Full administrative access", "resource": "*", "action": "*"},
]

DEFAULT_ROLE_PERMISSIONS = {
    "admin": ["admin"],
    "editor": ["users.read", "users.write", "roles.read", "permissions.read", "groups.read", "resources.read"],
    "viewer": ["users.read", "roles.read", "permissions.read", "groups.read", "resources.read"],
    "guest": [],
}


class PermissionService:
    """Business logic for permission operations."""

    def __init__(self):
        self.permission_crud = permission_crud
        self.role_crud = role_crud
        self.audit_service = audit_service

    async def create_permission(
        self,
        db: AsyncSession,
        *,
        name: str,
        description: Optional[str] = None,
        resource: str,
        action: str,
        resource_id: Optional[int] = None,
        actor_id: Optional[UUID] = None,
        ip_address: Optional[str] = None,
        user_agent: Optional[str] = None,
    ) -> Permission:
        existing = await self.permission_crud.get_by_name(db, name)
        if existing:
            raise ConflictError(detail=f"Permission '{name}' already exists")

        # Resolve resource name from resource_id if provided
        resolved_resource = resource
        if resource_id is not None:
            resource_obj = await resource_crud.get(db, resource_id)
            if resource_obj is None:
                raise NotFoundError(detail=f"Resource with id {resource_id} not found")
            resolved_resource = resource_obj.name

        perm = await self.permission_crud.create(
            db,
            {
                "name": name,
                "description": description,
                "resource": resolved_resource,
                "action": action,
                "resource_id": resource_id,
            },
        )

        await audit_service.log(
            event_type="permission.created",
            actor_id=actor_id,
            target_id=perm.id,
            target_type="permission",
            payload={"name": name, "resource": resolved_resource, "action": action},
            ip_address=ip_address,
            user_agent=user_agent,
        )
        return perm

    async def update_permission(
        self,
        db: AsyncSession,
        *,
        permission_id: int,
        data: PermissionUpdate,
        actor_id: Optional[UUID] = None,
        ip_address: Optional[str] = None,
        user_agent: Optional[str] = None,
    ) -> Permission:
        perm = await self.permission_crud.get(db, permission_id)
        if perm is None:
            raise NotFoundError(detail="Permission not found")
        if perm.name == "admin":
            raise ConflictError(detail="Cannot modify the 'admin' permission")

        update_data = data.model_dump(exclude_unset=True)

        # Resolve resource name from resource_id if provided
        if "resource_id" in update_data and update_data["resource_id"] is not None:
            resource_obj = await resource_crud.get(db, update_data["resource_id"])
            if resource_obj is None:
                raise NotFoundError(detail=f"Resource with id {update_data['resource_id']} not found")
            update_data["resource"] = resource_obj.name

        if not update_data:
            return perm

        updated = await self.permission_crud.update(db, id=permission_id, obj_in=update_data)

        await audit_service.log(
            event_type="permission.updated",
            actor_id=actor_id,
            target_id=permission_id,
            target_type="permission",
            payload=update_data,
            ip_address=ip_address,
            user_agent=user_agent,
        )
        return updated

    async def delete_permission(
        self,
        db: AsyncSession,
        *,
        permission_id: int,
        actor_id: Optional[UUID] = None,
        ip_address: Optional[str] = None,
        user_agent: Optional[str] = None,
    ) -> bool:
        perm = await self.permission_crud.get(db, permission_id)
        if perm is None:
            return False
        if perm.name == "admin":
            raise ConflictError(detail="Cannot delete the 'admin' permission")

        success = await self.permission_crud.delete(db, id=permission_id)
        if success:
            await audit_service.log(
                event_type="permission.deleted",
                actor_id=actor_id,
                target_id=permission_id,
                target_type="permission",
                payload={"permission_name": perm.name},
                ip_address=ip_address,
                user_agent=user_agent,
            )
        return success

    async def assign_permission_to_role(
        self,
        db: AsyncSession,
        *,
        role_id: int,
        permission_id: int,
        actor_id: Optional[UUID] = None,
        ip_address: Optional[str] = None,
        user_agent: Optional[str] = None,
    ) -> bool:
        role = await self.role_crud.get(db, role_id)
        if role is None:
            raise NotFoundError(detail="Role not found")
        perm = await self.permission_crud.get(db, permission_id)
        if perm is None:
            raise NotFoundError(detail="Permission not found")

        success = await self.permission_crud.assign_to_role(
            db, role_id=role_id, permission_id=permission_id
        )
        if success:
            await audit_service.log(
                event_type="permission.assigned",
                actor_id=actor_id,
                target_id=role_id,
                target_type="role",
                payload={"permission_id": permission_id, "permission_name": perm.name},
                ip_address=ip_address,
                user_agent=user_agent,
            )
        return success

    async def remove_permission_from_role(
        self,
        db: AsyncSession,
        *,
        role_id: int,
        permission_id: int,
        actor_id: Optional[UUID] = None,
        ip_address: Optional[str] = None,
        user_agent: Optional[str] = None,
    ) -> bool:
        success = await self.permission_crud.remove_from_role(
            db, role_id=role_id, permission_id=permission_id
        )
        if success:
            await audit_service.log(
                event_type="permission.removed",
                actor_id=actor_id,
                target_id=role_id,
                target_type="role",
                payload={"permission_id": permission_id},
                ip_address=ip_address,
                user_agent=user_agent,
            )
        return success

    async def set_role_permissions(
        self,
        db: AsyncSession,
        *,
        role_id: int,
        permission_ids: list[int],
        actor_id: Optional[UUID] = None,
        ip_address: Optional[str] = None,
        user_agent: Optional[str] = None,
    ) -> None:
        role = await self.role_crud.get(db, role_id)
        if role is None:
            raise NotFoundError(detail="Role not found")

        await self.permission_crud.set_role_permissions(
            db, role_id=role_id, permission_ids=permission_ids
        )

        await audit_service.log(
            event_type="permissions.set",
            actor_id=actor_id,
            target_id=role_id,
            target_type="role",
            payload={"permission_ids": permission_ids},
            ip_address=ip_address,
            user_agent=user_agent,
        )

    async def get_role_permissions(
        self, db: AsyncSession, role_id: int
    ) -> list[Permission]:
        return await self.permission_crud.get_role_permissions(db, role_id)

    async def get_user_permissions(
        self, db: AsyncSession, user_id: UUID
    ) -> set[str]:
        """Collect all unique permission names for a user from their roles."""
        from app.models.user import User
        from app.models.group import user_group_members, user_group_roles

        result = await db.execute(
            select(User).where(User.id == user_id)
        )
        user = result.scalar_one_or_none()
        if user is None:
            return set()

        # Get direct role IDs
        from app.models.user import user_roles
        direct_result = await db.execute(
            select(user_roles.c.role_id).where(user_roles.c.user_id == user_id)
        )
        direct_role_ids = {row[0] for row in direct_result.fetchall()}

        # Get group-inherited role IDs
        group_result = await db.execute(
            select(user_group_roles.c.role_id)
            .join(user_group_members, user_group_roles.c.user_group_id == user_group_members.c.user_group_id)
            .where(user_group_members.c.user_id == user_id)
        )
        group_role_ids = {row[0] for row in group_result.fetchall()}

        all_role_ids = direct_role_ids | group_role_ids
        if not all_role_ids:
            return set()

        # Get permission names from all roles
        perm_result = await db.execute(
            select(role_permissions.c.permission_id).where(
                role_permissions.c.role_id.in_(all_role_ids)
            )
        )
        perm_ids = {row[0] for row in perm_result.fetchall()}
        if not perm_ids:
            return set()

        perm_names_result = await db.execute(
            select(Permission.name).where(Permission.id.in_(perm_ids))
        )
        return {row[0] for row in perm_names_result.fetchall()}

    async def seed_default_permissions(self, db: AsyncSession) -> None:
        """Ensure default permissions and role assignments exist (idempotent)."""
        # Seed permissions
        perm_ids: dict[str, int] = {}
        for p in DEFAULT_PERMISSIONS:
            existing = await self.permission_crud.get_by_name(db, p["name"])
            if existing:
                perm_ids[p["name"]] = existing.id
            else:
                # Resolve resource_id from resource name
                rid = None
                if p["resource"] != "*":
                    res = await resource_crud.get_by_name(db, p["resource"])
                    if res:
                        rid = res.id
                perm = await self.permission_crud.create(
                    db, {**p, "resource_id": rid}
                )
                perm_ids[p["name"]] = perm.id

        # Seed role-permission assignments
        for role_name, perm_names in DEFAULT_ROLE_PERMISSIONS.items():
            role = await self.role_crud.get_by_name(db, role_name)
            if role is None:
                continue
            for pname in perm_names:
                pid = perm_ids.get(pname)
                if pid is not None:
                    await self.permission_crud.assign_to_role(
                        db, role_id=role.id, permission_id=pid
                    )


permission_service = PermissionService()
