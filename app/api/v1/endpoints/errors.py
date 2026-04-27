"""Error log endpoints (admin only)."""
from typing import Annotated

from fastapi import APIRouter, Depends, Query
from fastapi.responses import JSONResponse

from app.dependencies import get_current_user_with_permissions
from app.models.user import User
from app.services.error_service import error_service

router = APIRouter(prefix="/errors", tags=["errors"])


@router.get("/")
async def list_errors(
    current_user: Annotated[User, Depends(get_current_user_with_permissions)],
    skip: int = Query(0, ge=0),
    limit: int = Query(50, ge=1, le=200),
    search: str | None = Query(None, description="Search by request_id, path, exception_type, or detail"),
) -> dict:
    """List error logs (admin or users with errors.read)."""
    _check_errors_permission(current_user)

    items, total = await error_service.list_errors(skip=skip, limit=limit, search=search)
    # Convert ObjectId to string for JSON serialization
    for item in items:
        if "_id" in item:
            item["_id"] = str(item["_id"])
    return {"items": items, "total": total, "skip": skip, "limit": limit}


@router.get("/{error_id}")
async def get_error(
    error_id: str,
    current_user: Annotated[User, Depends(get_current_user_with_permissions)],
) -> dict:
    """Get a single error log by ID."""
    _check_errors_permission(current_user)

    error = await error_service.get_error(error_id)
    if error is None:
        return JSONResponse(status_code=404, content={"detail": "Error log not found"})
    if "_id" in error:
        error["_id"] = str(error["_id"])
    return error


def _check_errors_permission(user: User) -> None:
    """Raise 403 if user lacks errors.read or admin permission."""
    from app.core.exceptions import ForbiddenError

    for role in user.roles:
        for p in role.permissions:
            if p.name == "admin" or p.name == "errors.read":
                return
    for group in user.groups:
        for role in group.roles:
            for p in role.permissions:
                if p.name == "admin" or p.name == "errors.read":
                    return
    raise ForbiddenError(detail="Not enough permissions")
