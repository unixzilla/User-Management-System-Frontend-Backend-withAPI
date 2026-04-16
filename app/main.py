"""FastAPI application entry point."""
from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.config import settings
from app.db.postgres import init_engine, get_async_engine
from app.db.mongo import init_mongo
from app.models.user import User  # noqa
from app.models.role import Role  # noqa
from app.api.v1.router import api_router


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Application lifespan: initialize DB connections, run migrations."""
    # Startup
    init_engine()
    init_mongo()
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
