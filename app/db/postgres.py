"""Async PostgreSQL connection and session management using SQLAlchemy."""
from contextlib import asynccontextmanager
from typing import AsyncGenerator

from sqlalchemy.ext.asyncio import AsyncEngine, AsyncSession, create_async_engine
from sqlalchemy.orm import sessionmaker

from app.config import settings

_engine: AsyncEngine | None = None
_async_session_maker: sessionmaker | None = None


def init_engine() -> None:
    """Initialize the global async SQLAlchemy engine."""
    global _engine, _async_session_maker
    _engine = create_async_engine(
        settings.postgres_dsn,
        echo=False,
        pool_pre_ping=True,
    )
    _async_session_maker = sessionmaker(
        _engine, class_=AsyncSession, expire_on_commit=False
    )


def get_async_engine() -> AsyncEngine:
    """Get the global async engine (initializes if needed)."""
    if _engine is None:
        init_engine()
    return _engine


@asynccontextmanager
async def get_async_session() -> AsyncGenerator[AsyncSession, None]:
    """Provide an async database session with automatic cleanup."""
    if _async_session_maker is None:
        init_engine()

    async with _async_session_maker() as session:
        try:
            yield session
            await session.commit()
        except Exception:
            await session.rollback()
            raise
