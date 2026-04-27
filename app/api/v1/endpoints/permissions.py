"""Permission CRUD and role-permission management endpoints."""
from typing import Annotated

from fastapi import APIRouter, Depends, Query, Request, status
from sqlalchemy import select, func
from sqlalchemy.ext.asyncio import AsyncSession

from app.db.postgres import get_async_session
from app.models.user import User
from app.models.permission import Permission
from app.schemas.permission import (
    PermissionCreate,
    PermissionUpdate,
    PermissionOut,
    RolePermissionsUpdate,
)
from app.schemas.user import PaginatedResponse
from app.dependencies import get_db, require_permission
from app.services.permission_service import permission_service
from app.core.exceptions import NotFoundError, ConflictError

router = APIRouter(prefix="/permissions", tags=["permissions"])


@router.get("/", response_model=PaginatedResponse[PermissionOut])
async def list_permissions(
    db: Annotated[AsyncSession, Depends(get_db)],
    current_user: Annotated[User, Depends(require_permission("permissions.read"))],
    skip: int = Query(0, ge=0),
    limit: int = Query(100, ge=1, le=1000),
    search: str | None = Query(None, description="Search by name, resource, or action"),
) -> dict:
    """List all permissions with optional search and pagination."""
    query = select(Permission)
    count_query = select(func.count()).select_from(Permission)

    if search:
        pattern = f"%{search}%"
        filter_clause = (
            Permission.name.ilike(pattern)
            | Permission.resource.ilike(pattern)
            | Permission.action.ilike(pattern)
        )
        query = query.where(filter_clause)
        count_query = count_query.where(filter_clause)

    total_result = await db.execute(count_query)
    total = total_result.scalar_one()

    query = query.offset(skip).limit(limit)
    result = await db.execute(query)
    perms = result.scalars().all()

    return {"items": perms, "total": total, "skip": skip, "limit": limit}


@router.post("/", response_model=PermissionOut, status_code=status.HTTP_201_CREATED)
async def create_permission(
    request: Request,
    perm_in: PermissionCreate,
    db: Annotated[AsyncSession, Depends(get_db)],
    current_user: Annotated[User, Depends(require_permission("permissions.write"))],
):
    """Create a new permission."""
    return await permission_service.create_permission(
        db,
        name=perm_in.name,
        description=perm_in.description,
        resource=perm_in.resource,
        action=perm_in.action,
        resource_id=perm_in.resource_id,
        actor_id=current_user.id,
        ip_address=request.client.host if request.client else None,
        user_agent=request.headers.get("User-Agent"),
    )


@router.patch("/{permission_id}", response_model=PermissionOut)
async def update_permission(
    request: Request,
    permission_id: int,
    perm_in: PermissionUpdate,
    db: Annotated[AsyncSession, Depends(get_db)],
    current_user: Annotated[User, Depends(require_permission("permissions.write"))],
):
    """Update a permission."""
    return await permission_service.update_permission(
        db,
        permission_id=permission_id,
        data=perm_in,
        actor_id=current_user.id,
        ip_address=request.client.host if request.client else None,
        user_agent=request.headers.get("User-Agent"),
    )


@router.delete("/{permission_id}")
async def delete_permission(
    request: Request,
    permission_id: int,
    db: Annotated[AsyncSession, Depends(get_db)],
    current_user: Annotated[User, Depends(require_permission("permissions.delete"))],
) -> dict:
    """Delete a permission."""
    success = await permission_service.delete_permission(
        db,
        permission_id=permission_id,
        actor_id=current_user.id,
        ip_address=request.client.host if request.client else None,
        user_agent=request.headers.get("User-Agent"),
    )
    if not success:
        raise NotFoundError(detail="Permission not found")
    return {"message": "Permission deleted successfully"}


@router.get("/roles/{role_id}/permissions", response_model=list[PermissionOut])
async def get_role_permissions(
    role_id: int,
    db: Annotated[AsyncSession, Depends(get_db)],
    current_user: Annotated[User, Depends(require_permission("permissions.read"))],
) -> list:
    """Get all permissions for a specific role."""
    return await permission_service.get_role_permissions(db, role_id)


@router.put("/roles/{role_id}/permissions")
async def set_role_permissions(
    request: Request,
    role_id: int,
    body: RolePermissionsUpdate,
    db: Annotated[AsyncSession, Depends(get_db)],
    current_user: Annotated[User, Depends(require_permission("permissions.write"))],
) -> dict:
    """Replace all permissions for a role."""
    await permission_service.set_role_permissions(
        db,
        role_id=role_id,
        permission_ids=body.permission_ids,
        actor_id=current_user.id,
        ip_address=request.client.host if request.client else None,
        user_agent=request.headers.get("User-Agent"),
    )
    return {"message": "Role permissions updated successfully"}


@router.post("/roles/{role_id}/permissions")
async def assign_permission_to_role(
    request: Request,
    role_id: int,
    db: Annotated[AsyncSession, Depends(get_db)],
    current_user: Annotated[User, Depends(require_permission("permissions.write"))],
    permission_id: int = Query(..., description="Permission ID to assign"),
) -> dict:
    """Assign a permission to a role."""
    success = await permission_service.assign_permission_to_role(
        db,
        role_id=role_id,
        permission_id=permission_id,
        actor_id=current_user.id,
        ip_address=request.client.host if request.client else None,
        user_agent=request.headers.get("User-Agent"),
    )
    if not success:
        raise ConflictError(detail="Permission already assigned to role")
    return {"message": "Permission assigned to role successfully"}


@router.delete("/roles/{role_id}/permissions/{permission_id}")
async def remove_permission_from_role(
    request: Request,
    role_id: int,
    permission_id: int,
    db: Annotated[AsyncSession, Depends(get_db)],
    current_user: Annotated[User, Depends(require_permission("permissions.write"))],
) -> dict:
    """Remove a permission from a role."""
    success = await permission_service.remove_permission_from_role(
        db,
        role_id=role_id,
        permission_id=permission_id,
        actor_id=current_user.id,
        ip_address=request.client.host if request.client else None,
        user_agent=request.headers.get("User-Agent"),
    )
    if not success:
        raise NotFoundError(detail="Permission assignment not found")
    return {"message": "Permission removed from role successfully"}
