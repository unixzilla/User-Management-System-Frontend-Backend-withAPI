"""Aggregate all v1 API routers."""
from fastapi import APIRouter

from app.api.v1.endpoints import auth, users, roles, permissions, groups, resources

api_router = APIRouter(prefix="/api/v1")

api_router.include_router(auth.router)
api_router.include_router(users.router)
api_router.include_router(roles.router)
api_router.include_router(permissions.router)
api_router.include_router(groups.router)
api_router.include_router(resources.router)
