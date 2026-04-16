"""Role CRUD endpoints."""
from typing import Annotated

from fastapi import APIRouter, Depends, HTTPException, Query, Request, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.db.postgres import get_async_session
from app.services.role_service import role_service
from app.services.user_service import user_service
from app.models.user import User
from app.schemas.role import RoleCreate, RoleUpdate, RoleOut
from app.dependencies import get_current_user, get_current_active_admin, get_db

router = APIRouter(prefix="/roles", tags=["roles"])


@router.get("/", response_model=list[RoleOut])
async def list_roles(
    db: Annotated[AsyncSession, Depends(get_db)],
    current_user: Annotated[User, Depends(get_current_active_admin)],
    skip: int = Query(0, ge=0),
    limit: int = Query(100, ge=1, le=1000),
) -> list:
    """List all roles (admin only)."""
    return await role_service.get_multi(db, skip=skip, limit=limit)


@router.post("/", response_model=RoleOut, status_code=status.HTTP_201_CREATED)
async def create_role(
    request: Request,
    role_in: RoleCreate,
    db: Annotated[AsyncSession, Depends(get_db)],
    current_user: Annotated[User, Depends(get_current_active_admin)],
) -> dict:
    """Create a new role (admin only)."""
    try:
        return await role_service.create_role(
            db,
            name=role_in.name,
            description=role_in.description,
            actor_id=current_user.id,
            ip_address=request.client.host if request.client else None,
            user_agent=request.headers.get("User-Agent"),
        )
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))


@router.patch("/{role_id}", response_model=RoleOut)
async def update_role(
    request: Request,
    role_id: int,
    role_in: RoleUpdate,
    db: Annotated[AsyncSession, Depends(get_db)],
    current_user: Annotated[User, Depends(get_current_active_admin)],
) -> RoleOut:
    """Update an existing role (admin only)."""
    return await role_service.update_role(
        db,
        role_id=role_id,
        name=role_in.name,
        description=role_in.description,
        actor_id=current_user.id,
        ip_address=request.client.host if request.client else None,
        user_agent=request.headers.get("User-Agent"),
    )


@router.delete("/{role_id}")
async def delete_role(
    request: Request,
    role_id: int,
    db: Annotated[AsyncSession, Depends(get_db)],
    current_user: Annotated[User, Depends(get_current_active_admin)],
) -> dict:
    """Delete a role (admin only)."""
    success = await role_service.delete_role(
        db,
        role_id=role_id,
        actor_id=current_user.id,
        ip_address=request.client.host if request.client else None,
        user_agent=request.headers.get("User-Agent"),
    )

    if not success:
        raise HTTPException(status_code=404, detail="Role not found")

    return {"message": "Role deleted successfully"}
