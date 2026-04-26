"""UserGroup CRUD and member/role management endpoints."""
from typing import Annotated
from uuid import UUID

from fastapi import APIRouter, Depends, Query, Request, status
from sqlalchemy import select, func
from sqlalchemy.ext.asyncio import AsyncSession

from app.db.postgres import get_async_session
from app.models.user import User
from app.models.group import UserGroup
from app.schemas.group import UserGroupCreate, UserGroupUpdate, UserGroupOut, GroupMemberAdd
from app.schemas.user import PaginatedResponse
from app.dependencies import get_current_active_admin, get_db
from app.services.group_service import group_service
from app.core.exceptions import NotFoundError, ConflictError

router = APIRouter(prefix="/groups", tags=["groups"])


@router.get("/", response_model=PaginatedResponse[UserGroupOut])
async def list_groups(
    db: Annotated[AsyncSession, Depends(get_db)],
    current_user: Annotated[User, Depends(get_current_active_admin)],
    skip: int = Query(0, ge=0),
    limit: int = Query(100, ge=1, le=1000),
) -> dict:
    """List all groups with member counts (admin only)."""
    rows = await group_service.group_crud.get_multi_with_member_counts(
        db, skip=skip, limit=limit
    )
    items = []
    for group_obj, count in rows:
        d = UserGroupOut.model_validate(group_obj).model_dump()
        d["member_count"] = count
        items.append(d)

    total_result = await db.execute(select(func.count()).select_from(UserGroup))
    total = total_result.scalar_one()
    return {"items": items, "total": total, "skip": skip, "limit": limit}


@router.post("/", response_model=UserGroupOut, status_code=status.HTTP_201_CREATED)
async def create_group(
    request: Request,
    group_in: UserGroupCreate,
    db: Annotated[AsyncSession, Depends(get_db)],
    current_user: Annotated[User, Depends(get_current_active_admin)],
):
    """Create a new user group (admin only)."""
    return await group_service.create_group(
        db,
        name=group_in.name,
        description=group_in.description,
        actor_id=current_user.id,
        ip_address=request.client.host if request.client else None,
        user_agent=request.headers.get("User-Agent"),
    )


@router.get("/{group_id}", response_model=UserGroupOut)
async def get_group(
    group_id: int,
    db: Annotated[AsyncSession, Depends(get_db)],
    current_user: Annotated[User, Depends(get_current_active_admin)],
):
    """Get group detail with members and roles (admin only)."""
    g = await group_service.group_crud.get_with_members(db, group_id)
    if g is None:
        raise NotFoundError(detail="Group not found")
    d = UserGroupOut.model_validate(g).model_dump()
    d["member_count"] = len(g.members)
    return d


@router.patch("/{group_id}", response_model=UserGroupOut)
async def update_group(
    request: Request,
    group_id: int,
    group_in: UserGroupUpdate,
    db: Annotated[AsyncSession, Depends(get_db)],
    current_user: Annotated[User, Depends(get_current_active_admin)],
):
    """Update a user group (admin only)."""
    return await group_service.update_group(
        db,
        group_id=group_id,
        name=group_in.name,
        description=group_in.description,
        actor_id=current_user.id,
        ip_address=request.client.host if request.client else None,
        user_agent=request.headers.get("User-Agent"),
    )


@router.delete("/{group_id}")
async def delete_group(
    request: Request,
    group_id: int,
    db: Annotated[AsyncSession, Depends(get_db)],
    current_user: Annotated[User, Depends(get_current_active_admin)],
) -> dict:
    """Delete a user group (admin only)."""
    success = await group_service.delete_group(
        db,
        group_id=group_id,
        actor_id=current_user.id,
        ip_address=request.client.host if request.client else None,
        user_agent=request.headers.get("User-Agent"),
    )
    if not success:
        raise NotFoundError(detail="Group not found")
    return {"message": "Group deleted successfully"}


@router.post("/{group_id}/members")
async def add_member_to_group(
    request: Request,
    group_id: int,
    body: GroupMemberAdd,
    db: Annotated[AsyncSession, Depends(get_db)],
    current_user: Annotated[User, Depends(get_current_active_admin)],
) -> dict:
    """Add a user to a group (admin only)."""
    success = await group_service.add_member(
        db,
        group_id=group_id,
        user_id=UUID(body.user_id),
        actor_id=current_user.id,
        ip_address=request.client.host if request.client else None,
        user_agent=request.headers.get("User-Agent"),
    )
    if not success:
        raise ConflictError(detail="User already in group")
    return {"message": "Member added successfully"}


@router.delete("/{group_id}/members/{user_id}")
async def remove_member_from_group(
    request: Request,
    group_id: int,
    user_id: str,
    db: Annotated[AsyncSession, Depends(get_db)],
    current_user: Annotated[User, Depends(get_current_active_admin)],
) -> dict:
    """Remove a user from a group (admin only)."""
    success = await group_service.remove_member(
        db,
        group_id=group_id,
        user_id=UUID(user_id),
        actor_id=current_user.id,
        ip_address=request.client.host if request.client else None,
        user_agent=request.headers.get("User-Agent"),
    )
    if not success:
        raise NotFoundError(detail="Membership not found")
    return {"message": "Member removed successfully"}


@router.post("/{group_id}/roles")
async def assign_role_to_group(
    request: Request,
    group_id: int,
    db: Annotated[AsyncSession, Depends(get_db)],
    current_user: Annotated[User, Depends(get_current_active_admin)],
    role_id: int = Query(..., description="Role ID to assign"),
) -> dict:
    """Assign a role to a group (admin only)."""
    success = await group_service.assign_role_to_group(
        db,
        group_id=group_id,
        role_id=role_id,
        actor_id=current_user.id,
        ip_address=request.client.host if request.client else None,
        user_agent=request.headers.get("User-Agent"),
    )
    if not success:
        raise ConflictError(detail="Role already assigned to group")
    return {"message": "Role assigned to group successfully"}


@router.delete("/{group_id}/roles/{role_id}")
async def remove_role_from_group(
    request: Request,
    group_id: int,
    role_id: int,
    db: Annotated[AsyncSession, Depends(get_db)],
    current_user: Annotated[User, Depends(get_current_active_admin)],
) -> dict:
    """Remove a role from a group (admin only)."""
    success = await group_service.remove_role_from_group(
        db,
        group_id=group_id,
        role_id=role_id,
        actor_id=current_user.id,
        ip_address=request.client.host if request.client else None,
        user_agent=request.headers.get("User-Agent"),
    )
    if not success:
        raise NotFoundError(detail="Role assignment not found")
    return {"message": "Role removed from group successfully"}
