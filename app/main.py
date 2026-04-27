"""FastAPI application entry point."""
from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.config import settings
from app.db.postgres import init_engine, get_async_engine
from app.db.mongo import init_mongo
from app.models.user import User  # noqa
from app.models.role import Role  # noqa
from app.models.permission import Permission  # noqa
from app.models.group import UserGroup  # noqa
from app.models.resource import Resource  # noqa
from app.api.v1.router import api_router


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Application lifespan: initialize DB connections, seed data."""
    # Startup
    init_engine()
    init_mongo()

    # Seed default data (idempotent)
    from app.db.postgres import get_async_session
    from app.services.role_service import role_service
    from app.services.resource_service import resource_service
    from app.services.permission_service import permission_service
    from app.services.group_service import group_service
    from app.services.user_service import user_service

    async with get_async_session() as db:
        # 1. Seed roles (admin, editor, viewer, guest)
        await role_service.seed_initial_roles(db)

        # 2. Seed resources (must happen before permissions which reference them)
        await resource_service.seed_default_resources(db)

        # 3. Seed permissions and role-permission assignments
        await permission_service.seed_default_permissions(db)

        # 4. Seed groups (admin, guest) with role assignments
        group_ids = await group_service.seed_default_groups(db)

        # 5. Seed users (admin, guest) with role and group assignments
        await user_service.seed_default_users(db, group_ids)

        await db.commit()

    yield
    # Shutdown
    engine = get_async_engine()
    await engine.dispose()


app = FastAPI(
    title=settings.project_name,
    version=settings.version,
    description="Production-ready User Management Web Service",
    lifespan=lifespan,
)

# CORS middleware
if settings.cors_origins:
    app.add_middleware(
        CORSMiddleware,
        allow_origins=settings.cors_origins,
        allow_credentials=True,
        allow_methods=["*"],
        allow_headers=["*"],
    )

# Include API routers
app.include_router(api_router)


@app.get("/health")
async def health_check() -> dict:
    """Health check endpoint."""
    return {"status": "healthy", "service": settings.project_name}


@app.get("/")
async def root() -> dict:
    """Root endpoint with service info."""
    return {
        "service": settings.project_name,
        "version": settings.version,
        "docs": "/docs",
    }
