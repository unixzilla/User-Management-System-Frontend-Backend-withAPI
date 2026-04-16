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
from app.core.exceptions import ConflictError, NotFoundError, BadRequestError


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
    ) -> List[User]:
        """List users with optional filters."""
        return await self.user_crud.get_multi_with_roles(
            db, skip=skip, limit=limit, active_only=active_only
        )

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
        # Fetch current user to track changes
        user = await self.user_crud.get_with_roles(db, user_id)
        if user is None or user.deleted_at is not None:
            raise NotFoundError(detail="User not found")

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
        """Soft delete a user."""
        user = await self.user_crud.get(db, user_id)
        if user is None or user.deleted_at is not None:
            raise NotFoundError(detail="User not found")

        # Get role count for audit
        roles_before = len(user.roles) if user.roles else 0

        success = await self.user_crud.soft_delete(db, user_id=user_id)

        if success:
            await audit_service.log(
                event_type="user.deleted",
                actor_id=actor_id,
                target_id=user_id,
                target_type="user",
                payload={"roles_removed": roles_before},
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
        actor_id: Optional[UUID] = None,
        ip_address: Optional[str] = None,
        user_agent: Optional[str] = None,
    ) -> bool:
        """Remove a role from a user."""
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


user_service = UserService()
