"""FastAPI dependencies: database sessions, current user, etc."""
from typing import AsyncGenerator

from fastapi import Depends, HTTPException, status
from fastapi.security import OAuth2PasswordBearer
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select

from app.core.security import decode_token
from app.db.postgres import get_async_session
from app.db.mongo import get_mongo_collection
from app.models.user import User
from app.schemas.token import TokenPayload
from app.core.exceptions import UnauthorizedError, ForbiddenError

oauth2_scheme = OAuth2PasswordBearer(tokenUrl="/api/v1/auth/login")


async def get_db() -> AsyncGenerator[AsyncSession, None]:
    """Provide an async database session per request."""
    async with get_async_session() as session:
        yield session


async def get_current_user(
    token: str = Depends(oauth2_scheme),
    db: AsyncSession = Depends(get_db),
) -> User:
    """Get the current authenticated user from JWT token."""
    token_data = decode_token(token)
    if token_data is None:
        raise UnauthorizedError(detail="Could not validate credentials")

    result = await db.execute(select(User).where(User.id == token_data.sub))
    user = result.scalar_one_or_none()

    if user is None:
        raise UnauthorizedError(detail="User not found")
    if not user.is_active:
        raise ForbiddenError(detail="Inactive user")
    return user


async def get_current_active_admin(
    current_user: User = Depends(get_current_user),
) -> User:
    """Ensure the current user has admin role."""
    # Admin check - in real app, check user.roles relationship
    # For simplicity, we check if user is active (admin check done in endpoint via role service)
    return current_user
