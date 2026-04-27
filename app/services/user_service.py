"""User business logic service."""
from typing import Optional, List
from uuid import UUID

from sqlalchemy.ext.asyncio import AsyncSession

from app.crud.user import user as user_crud
from app.crud.role import role as role_crud
from app.models.user import User
from app.models.role import Role
from app.schemas.user import UserCreate, UserUpdate
from app.services.audit_service import audit_service
from app.core.exceptions import ConflictError, NotFoundError, BadRequestError, ForbiddenError


class UserService:
    """Business logic for user operations."""

    def __init__(self):
        self.user_crud = user_crud
        self.role_crud = role_crud
        self.audit_service = audit_service

    async def create_user(
        self,
        db: AsyncSession,
        *,
        user_in: UserCreate,
        actor_id: Optional[UUID] = None,
        ip_address: Optional[str] = None,
        user_agent: Optional[str] = None,
    ) -> User:
        """Create a new user with validation."""
        # Check for existing email
        existing = await self.user_crud.get_by_email(db, user_in.email)
        if existing:
            raise ConflictError(detail="Email already registered")

        # Check for existing username
        existing_username = await self.user_crud.get_by_username(
            db, user_in.username
        )
        if existing_username:
            raise ConflictError(detail="Username already taken")

        # Create user
        user = await self.user_crud.create_with_password(
            db,
            email=user_in.email,
            username=user_in.username,
            password=user_in.password,
        )

        # Set full name if provided
        if user_in.full_name:
            user.full_name = user_in.full_name
            await db.flush()
            await db.refresh(user)

        # Audit log
        await audit_service.log(
            event_type="user.created",
            actor_id=actor_id,
            target_id=user.id,
            target_type="user",
            payload={"created_fields": ["email", "username"]},
            ip_address=ip_address,
            user_agent=user_agent,
        )

        return user

    async def get_user(
        self, db: AsyncSession, user_id: UUID
    ) -> Optional[User]:
        """Get a user by ID (including soft-deleted)."""
        return await self.user_crud.get_with_roles(db, user_id)

    async def list_users(
        self,
        db: AsyncSession,
        *,
        skip: int = 0,
        limit: int = 100,
        active_only: bool = False,
        search: str | None = None,
    ) -> List[User]:
        """List users with optional filters."""
        return await self.user_crud.get_multi_with_roles(
            db, skip=skip, limit=limit, active_only=active_only, search=search
        )

    async def count_users(
        self,
        db: AsyncSession,
        *,
        active_only: bool = False,
        search: str | None = None,
    ) -> int:
        """Get total count of users."""
        return await self.user_crud.count_users(db, active_only=active_only, search=search)

    async def update_user(
        self,
        db: AsyncSession,
        *,
        user_id: UUID,
        user_in: UserUpdate,
        actor_id: Optional[UUID] = None,
        ip_address: Optional[str] = None,
        user_agent: Optional[str] = None,
    ) -> Optional[User]:
        """Update an existing user."""
        from app.config import settings

        # Fetch current user to track changes
        user = await self.user_crud.get_with_roles(db, user_id)
        if user is None or user.deleted_at is not None:
            raise NotFoundError(detail="User not found")

        # Prevent deactivating the system admin user
        if user.email == settings.first_superuser_email and user_in.is_active is False:
            raise ConflictError(detail="Cannot deactivate the system administrator account")

        update_data = user_in.model_dump(exclude_unset=True)
        changed_fields = list(update_data.keys())

        # Handle password separately
        if "password" in update_data:
            from app.core.security import hash_password
            update_data["hashed_password"] = hash_password(update_data.pop("password"))

        if not update_data:
            return user

        user = await self.user_crud.update(db, id=user_id, obj_in=update_data)
        if user is None:
            raise NotFoundError(detail="User not found")

        await db.refresh(user)

        # Audit log
        await audit_service.log(
            event_type="user.updated",
            actor_id=actor_id,
            target_id=user_id,
            target_type="user",
            payload={"changed_fields": changed_fields},
            ip_address=ip_address,
            user_agent=user_agent,
        )

        return user

    async def delete_user(
        self,
        db: AsyncSession,
        *,
        user_id: UUID,
        actor_id: Optional[UUID] = None,
        ip_address: Optional[str] = None,
        user_agent: Optional[str] = None,
    ) -> bool:
        """Hard delete a user — removes from database completely."""
        user = await self.user_crud.get_with_roles(db, user_id)
        if user is None or user.deleted_at is not None:
            raise NotFoundError(detail="User not found")

        # Prevent self-deletion
        if actor_id is not None and str(user_id) == str(actor_id):
            raise ConflictError(detail="Cannot delete your own account")

        # Protect system admin user from deletion
        from app.config import settings
        if user.email == settings.first_superuser_email:
            raise ConflictError(detail="Cannot delete the system administrator account")

        # Get counts for audit before deletion
        roles_before = len(user.roles) if user.roles else 0
        groups_before = len(user.groups) if user.groups else 0

        # Hard delete — FK cascade handles role/group cleanup automatically
        success = await self.user_crud.delete(db, user_id)

        if success:
            await audit_service.log(
                event_type="user.deleted",
                actor_id=actor_id,
                target_id=user_id,
                target_type="user",
                payload={"roles_removed": roles_before, "groups_removed": groups_before},
                ip_address=ip_address,
                user_agent=user_agent,
            )

        return success

    async def assign_role(
        self,
        db: AsyncSession,
        *,
        user_id: UUID,
        role_id: int,
        actor: Optional[User] = None,
        actor_id: Optional[UUID] = None,
        ip_address: Optional[str] = None,
        user_agent: Optional[str] = None,
    ) -> bool:
        """Assign a role to a user."""
        # Verify user exists
        user = await self.user_crud.get(db, user_id)
        if user is None or user.deleted_at is not None:
            raise NotFoundError(detail="User not found")

        # Verify role exists
        role = await self.role_crud.get(db, role_id)
        if role is None:
            raise NotFoundError(detail="Role not found")

        # Only admin can assign the admin role
        if role.name == "admin" and (actor is None or not actor.is_admin):
            raise ForbiddenError(detail="Only administrators can assign the admin role")

        success = await self.user_crud.assign_role(db, user_id=user_id, role_id=role_id)

        if success:
            await audit_service.log(
                event_type="role.assigned",
                actor_id=actor_id,
                target_id=user_id,
                target_type="user",
                payload={"assigned_role_id": role_id, "role_name": role.name},
                ip_address=ip_address,
                user_agent=user_agent,
            )

        return success

    async def remove_role(
        self,
        db: AsyncSession,
        *,
        user_id: UUID,
        role_id: int,
        actor: Optional[User] = None,
        actor_id: Optional[UUID] = None,
        ip_address: Optional[str] = None,
        user_agent: Optional[str] = None,
    ) -> bool:
        """Remove a role from a user."""
        from app.config import settings

        # Verify role exists and only admin can remove the admin role
        role = await self.role_crud.get(db, role_id)
        if role and role.name == "admin" and (actor is None or not actor.is_admin):
            raise ForbiddenError(detail="Only administrators can remove the admin role")

        # Prevent removing the admin role from the system administrator account
        if role and role.name == "admin":
            user = await self.user_crud.get(db, user_id)
            if user and user.email == settings.first_superuser_email:
                raise ConflictError(detail="Cannot remove the admin role from the system administrator account")

        success = await self.user_crud.remove_role(db, user_id=user_id, role_id=role_id)

        if success:
            await audit_service.log(
                event_type="role.removed",
                actor_id=actor_id,
                target_id=user_id,
                target_type="user",
                payload={"removed_role_id": role_id},
                ip_address=ip_address,
                user_agent=user_agent,
            )

        return success


    async def seed_default_users(
        self, db: AsyncSession, group_ids: dict[str, int | None]
    ) -> None:
        """Ensure default admin and guest users exist (idempotent).

        Creates admin and guest users with their roles assigned.
        Adds them to their respective groups.
        """
        from app.config import settings
        from app.core.security import hash_password
        from app.crud.group import group as group_crud

        admin_role = await self.role_crud.get_by_name(db, "admin")
        guest_role = await self.role_crud.get_by_name(db, "guest")

        # --- Admin user ---
        admin_user = await self.user_crud.get_by_email(db, settings.first_superuser_email)
        if admin_user is None:
            admin_user = await self.user_crud.create_with_password(
                db,
                email=settings.first_superuser_email,
                username=settings.first_superuser_username,
                password=settings.first_superuser_password,
            )
            admin_user.full_name = "System Administrator"
            admin_user.is_verified = True
            await db.flush()
            await db.refresh(admin_user)

        # Ensure admin user has admin role
        if admin_role and admin_role not in admin_user.roles:
            await self.user_crud.assign_role(db, user_id=admin_user.id, role_id=admin_role.id)

        # Add admin to admin group
        admin_group_id = group_ids.get("admin")
        if admin_group_id is not None:
            await group_crud.add_member(db, group_id=admin_group_id, user_id=admin_user.id)

        # --- Guest user ---
        guest_user = await self.user_crud.get_by_email(db, settings.guest_user_email)
        if guest_user is None:
            guest_user = await self.user_crud.create_with_password(
                db,
                email=settings.guest_user_email,
                username=settings.guest_user_username,
                password=settings.guest_user_password,
            )
            guest_user.full_name = "Guest User"
            guest_user.is_verified = True
            await db.flush()
            await db.refresh(guest_user)

        # Ensure guest user has guest role
        if guest_role and guest_role not in guest_user.roles:
            await self.user_crud.assign_role(db, user_id=guest_user.id, role_id=guest_role.id)

        # Add guest to guest group
        guest_group_id = group_ids.get("guest")
        if guest_group_id is not None:
            await group_crud.add_member(db, group_id=guest_group_id, user_id=guest_user.id)


user_service = UserService()
