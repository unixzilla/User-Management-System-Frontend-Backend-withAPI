"""Resource CRUD endpoints."""
from typing import Annotated

from fastapi import APIRouter, Depends, Query, Request, status
from sqlalchemy import select, func
from sqlalchemy.ext.asyncio import AsyncSession

from app.db.postgres import get_async_session
from app.models.user import User
from app.models.resource import Resource
from app.schemas.resource import (
    ResourceCreate,
    ResourceUpdate,
    ResourceOut,
)
from app.schemas.user import PaginatedResponse
from app.dependencies import get_current_active_admin, get_db, require_permission
from app.services.resource_service import resource_service
from app.crud.resource import resource as resource_crud
from app.core.exceptions import NotFoundError

router = APIRouter(prefix="/resources", tags=["resources"])


@router.get("/", response_model=PaginatedResponse[ResourceOut])
async def list_resources(
    db: Annotated[AsyncSession, Depends(get_db)],
    current_user: Annotated[User, Depends(require_permission("permissions.read"))],
    skip: int = Query(0, ge=0),
    limit: int = Query(100, ge=1, le=1000),
) -> dict:
    """List all resources."""
    resources = await resource_crud.get_multi(db, skip=skip, limit=limit)
    total_result = await db.execute(select(func.count()).select_from(Resource))
    total = total_result.scalar_one()
    return {"items": resources, "total": total, "skip": skip, "limit": limit}


@router.get("/{resource_id}", response_model=ResourceOut)
async def get_resource(
    resource_id: int,
    db: Annotated[AsyncSession, Depends(get_db)],
    current_user: Annotated[User, Depends(require_permission("permissions.read"))],
):
    """Get a resource by ID."""
    resource = await resource_crud.get(db, resource_id)
    if resource is None:
        raise NotFoundError(detail="Resource not found")
    return resource


@router.post("/", response_model=ResourceOut, status_code=status.HTTP_201_CREATED)
async def create_resource(
    request: Request,
    resource_in: ResourceCreate,
    db: Annotated[AsyncSession, Depends(get_db)],
    current_user: Annotated[User, Depends(require_permission("permissions.write"))],
):
    """Create a new resource."""
    return await resource_service.create_resource(
        db,
        name=resource_in.name,
        description=resource_in.description,
        actor_id=current_user.id,
        ip_address=request.client.host if request.client else None,
        user_agent=request.headers.get("User-Agent"),
    )


@router.patch("/{resource_id}", response_model=ResourceOut)
async def update_resource(
    request: Request,
    resource_id: int,
    resource_in: ResourceUpdate,
    db: Annotated[AsyncSession, Depends(get_db)],
    current_user: Annotated[User, Depends(require_permission("permissions.write"))],
):
    """Update a resource."""
    return await resource_service.update_resource(
        db,
        resource_id=resource_id,
        name=resource_in.name,
        description=resource_in.description,
        actor_id=current_user.id,
        ip_address=request.client.host if request.client else None,
        user_agent=request.headers.get("User-Agent"),
    )


@router.delete("/{resource_id}")
async def delete_resource(
    request: Request,
    resource_id: int,
    db: Annotated[AsyncSession, Depends(get_db)],
    current_user: Annotated[User, Depends(require_permission("permissions.delete"))],
) -> dict:
    """Delete a resource and cascade-delete all associated permissions."""
    success = await resource_service.delete_resource(
        db,
        resource_id=resource_id,
        actor_id=current_user.id,
        ip_address=request.client.host if request.client else None,
        user_agent=request.headers.get("User-Agent"),
    )
    if not success:
        raise NotFoundError(detail="Resource not found")
    return {"message": "Resource and associated permissions deleted successfully"}
