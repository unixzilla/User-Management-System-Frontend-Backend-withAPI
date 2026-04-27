"""User CRUD endpoints."""
from typing import Annotated
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, Query, Request, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select

from app.db.postgres import get_async_session
from app.services.user_service import user_service
from app.models.user import User
from app.models.role import Role
from app.schemas.user import UserCreate, UserUpdate, UserOut, PaginatedResponse
from app.dependencies import get_current_user, get_db, require_permission
from app.core.exceptions import NotFoundError, ConflictError, ForbiddenError
from app.core.security import decode_token
from app.crud.role import role as role_crud

router = APIRouter(prefix="/users", tags=["users"])


@router.get("/", response_model=PaginatedResponse[UserOut])
async def list_users(
    db: Annotated[AsyncSession, Depends(get_db)],
    current_user: Annotated[User, Depends(require_permission("users.read"))],
    skip: int = Query(0, ge=0),
    limit: int = Query(100, ge=1, le=1000),
    active_only: bool = Query(False),
    search: str | None = Query(None, description="Search by email or username"),
) -> dict:
    """List all users."""
    users = await user_service.list_users(
        db, skip=skip, limit=limit, active_only=active_only, search=search
    )
    total = await user_service.count_users(db, active_only=active_only, search=search)
    return {"items": users, "total": total, "skip": skip, "limit": limit}


@router.get("/me", response_model=UserOut)
async def get_current_user_profile(
    db: Annotated[AsyncSession, Depends(get_db)],
    current_user: Annotated[User, Depends(get_current_user)],
) -> User:
    """Get the current authenticated user's profile."""
    return current_user


@router.post("/", response_model=UserOut, status_code=status.HTTP_201_CREATED)
async def create_user(
    request: Request,
    user_in: UserCreate,
    db: Annotated[AsyncSession, Depends(get_db)],
    current_user: Annotated[User, Depends(require_permission("users.write"))],
) -> User:
    """Create a new user."""
    return await user_service.create_user(
        db,
        user_in=user_in,
        actor_id=current_user.id,
        ip_address=request.client.host if request.client else None,
        user_agent=request.headers.get("User-Agent"),
    )


@router.get("/{user_id}", response_model=UserOut)
async def get_user(
    user_id: UUID,
    db: Annotated[AsyncSession, Depends(get_db)],
    current_user: Annotated[User, Depends(get_current_user)],
) -> User:
    """Get a specific user by ID."""
    user = await user_service.get_user(db, user_id)
    if user is None:
        raise NotFoundError(detail="User not found")

    if current_user.id != user_id and not current_user.is_admin:
        raise ForbiddenError(detail="Not enough permissions")

    return user


@router.patch("/{user_id}", response_model=UserOut)
async def update_user(
    request: Request,
    user_id: UUID,
    user_in: UserUpdate,
    db: Annotated[AsyncSession, Depends(get_db)],
    current_user: Annotated[User, Depends(get_current_user)],
) -> User:
    """Update a user's information."""
    if current_user.id != user_id and not current_user.is_admin:
        raise ForbiddenError(detail="Not enough permissions")

    return await user_service.update_user(
        db,
        user_id=user_id,
        user_in=user_in,
        actor_id=current_user.id,
        ip_address=request.client.host if request.client else None,
        user_agent=request.headers.get("User-Agent"),
    )


@router.delete("/{user_id}")
async def delete_user(
    request: Request,
    user_id: UUID,
    db: Annotated[AsyncSession, Depends(get_db)],
    current_user: Annotated[User, Depends(require_permission("users.delete"))],
) -> dict:
    """Delete a user."""
    success = await user_service.delete_user(
        db,
        user_id=user_id,
        actor_id=current_user.id,
        ip_address=request.client.host if request.client else None,
        user_agent=request.headers.get("User-Agent"),
    )

    if not success:
        raise NotFoundError(detail="User not found or already deleted")

    return {"message": "User deleted successfully"}


@router.post("/{user_id}/roles", status_code=status.HTTP_200_OK)
async def assign_role_to_user(
    request: Request,
    user_id: UUID,
    db: Annotated[AsyncSession, Depends(get_db)],
    current_user: Annotated[User, Depends(require_permission("users.write"))],
    role_id: int = Query(..., description="Role ID to assign"),
) -> dict:
    """Assign a role to a user."""
    success = await user_service.assign_role(
        db,
        user_id=user_id,
        role_id=role_id,
        actor=current_user,
        actor_id=current_user.id,
        ip_address=request.client.host if request.client else None,
        user_agent=request.headers.get("User-Agent"),
    )

    if not success:
        raise ConflictError(detail="Role already assigned or invalid")

    return {"message": "Role assigned successfully"}


@router.delete("/{user_id}/roles/{role_id}")
async def remove_role_from_user(
    request: Request,
    user_id: UUID,
    role_id: int,
    db: Annotated[AsyncSession, Depends(get_db)],
    current_user: Annotated[User, Depends(require_permission("users.write"))],
) -> dict:
    """Remove a role from a user."""
    success = await user_service.remove_role(
        db,
        user_id=user_id,
        role_id=role_id,
        actor=current_user,
        actor_id=current_user.id,
        ip_address=request.client.host if request.client else None,
        user_agent=request.headers.get("User-Agent"),
    )

    if not success:
        raise NotFoundError(detail="Role assignment not found")

    return {"message": "Role removed successfully"}
