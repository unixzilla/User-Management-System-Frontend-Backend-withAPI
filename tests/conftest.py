"""Pytest configuration and shared fixtures."""
import asyncio
import os
from typing import AsyncGenerator, Generator
from uuid import uuid4

import pytest
import pytest_asyncio
from fastapi import FastAPI
from fastapi.testclient import TestClient
from httpx import AsyncClient
from sqlalchemy.ext.asyncio import AsyncSession, create_async_engine, async_sessionmaker
from sqlalchemy.pool import NullPool

from app.main import app as fastapi_app
from app.config import Settings, settings
from app.db.postgres import Base, get_async_session as original_get_session
from app.db.mongo import get_mongo_collection, init_mongo

# Override settings for tests
test_settings = Settings(
    postgres_user="postgres_test",
    postgres_password="postgres_test",
    postgres_db="test_db",
    postgres_host="localhost",
    postgres_port=5432,
    secret_key="test-secret-key-32-characters-long!!!",
    cors_origins=["http://testserver"],
)

# Test database URL
TEST_DATABASE_URL = "postgresql+asyncpg://postgres_test:postgres_test@localhost:5432/test_db"


# --- Engine & Session Fixtures ---

@pytest_asyncio.fixture(scope="session")
def event_loop() -> Generator:
    """Override event loop for asyncio tests."""
    loop = asyncio.new_event_loop()
    yield loop
    loop.close()


@pytest_asyncio.fixture(scope="session")
async def test_engine():
    """Create test database engine."""
    engine = create_async_engine(
        TEST_DATABASE_URL,
        echo=False,
        poolclass=NullPool,
    )

    # Create all tables
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)

    yield engine

    # Drop all tables
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.drop_all)

    await engine.dispose()


@pytest_asyncio.fixture
async def test_db_session(test_engine) -> AsyncSession:
    """Create an isolated database session per test."""
    async_session = async_sessionmaker(
        test_engine, class_=AsyncSession, expire_on_commit=False
    )

    async with async_session() as session:
        # Start a transaction
        await session.begin()
        yield session
        # Rollback after test
        await session.rollback()
        await session.close()


@pytest_asyncio.fixture(scope="session")
async def mongo_test_db():
    """Initialize test MongoDB and return database."""
    init_mongo()
    db = get_mongo_collection("audit_logs")
    # Clear collection before tests
    await db.delete_many({})
    yield db
    # Cleanup after all tests
    await db.delete_many({})


# --- FastAPI Test Client Fixtures ---

@pytest_asyncio.fixture
async def async_client(test_db_session) -> AsyncGenerator[AsyncClient, None]:
    """Async HTTP client for testing endpoints."""
    # Override the DB dependency
    async def override_get_db():
        yield test_db_session

    fastapi_app.dependency_overrides[original_get_session] = override_get_db

    async with AsyncClient(
        app=fastapi_app,
        base_url="http://test",
    ) as client:
        yield client

    fastapi_app.dependency_overrides.clear()


@pytest.fixture
def client() -> TestClient:
    """Synchronous test client."""
    return TestClient(fastapi_app)


# --- Factory Fixtures ---

@pytest_asyncio.fixture
async def make_user(test_db_session, mongo_test_db):
    """Factory to create a user for tests."""
    from app.crud.user import user as user_crud
    from app.core.security import hash_password

    async def _make_user(
        email: str = None,
        username: str = None,
        password: str = "testpass123",
        is_active: bool = True,
        is_verified: bool = False,
    ) -> dict:
        email = email or f"test_{uuid4().hex[:8]}@example.com"
        username = username or f"user_{uuid4().hex[:8]}"

        user_obj = await user_crud.create_with_password(
            test_db_session,
            email=email,
            username=username,
            password=password,
        )
        user_obj.full_name = "Test User"
        user_obj.is_active = is_active
        user_obj.is_verified = is_verified
        await test_db_session.flush()
        await test_db_session.refresh(user_obj)
        return user_obj

    return _make_user


@pytest_asyncio.fixture
async def make_role(test_db_session):
    """Factory to create a role for tests."""
    from app.crud.role import role as role_crud

    async def _make_role(
        name: str = None,
        description: str = "Test role",
    ):
        name = name or f"role_{uuid4().hex[:8]}"
        existing = await role_crud.get_by_name(test_db_session, name)
        if existing:
            return existing

        role = await role_crud.create(
            test_db_session,
            {"name": name, "description": description}
        )
        return role

    return _make_role


@pytest_asyncio.fixture
async def make_admin_token(test_db_session, make_user) -> str:
    """Factory to create an admin user and return their access token."""
    from app.core.security import create_access_token
    from app.services.role_service import role_service
    from app.crud.user import user as user_crud

    # Ensure roles exist (idempotent)
    await role_service.seed_initial_roles(test_db_session)

    admin = await make_user(
        email="admin@test.com",
        username="admin_test",
        is_active=True,
    )

    # Assign admin role
    admin_role = await role_service.role_crud.get_by_name(test_db_session, "admin")
    if admin_role:
        await user_crud.assign_role(
            test_db_session,
            user_id=admin.id,
            role_id=admin_role.id,
        )

    return create_access_token(subject=str(admin.id))


@pytest_asyncio.fixture
def auth_headers(make_admin_token) -> dict:
    """Return auth headers with admin token."""
    token = make_admin_token()
    return {"Authorization": f"Bearer {token}"}
