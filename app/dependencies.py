"""FastAPI dependencies: database sessions, current user, etc."""
from typing import AsyncGenerator, Callable

from fastapi import Depends, HTTPException, status
from fastapi.security import OAuth2PasswordBearer
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from sqlalchemy.orm import selectinload

from app.core.security import decode_token
from app.db.postgres import get_async_session
from app.db.mongo import get_mongo_collection
from app.models.user import User
from app.models.role import Role
from app.schemas.token import TokenPayload
from app.core.exceptions import UnauthorizedError, ForbiddenError

oauth2_scheme = OAuth2PasswordBearer(tokenUrl="/api/v1/auth/login")


async def get_db() -> AsyncGenerator[AsyncSession, None]:
    """Provide an async database session per request."""
    async with get_async_session() as session:
        yield session


async def _is_token_revoked(db: AsyncSession, jti: str) -> bool:
    """Check if a token's jti is in the blocklist."""
    from app.models.token_blocklist import TokenBlocklist
    result = await db.execute(
        select(TokenBlocklist).where(TokenBlocklist.jti == jti)
    )
    return result.scalar_one_or_none() is not None


async def get_current_user(
    token: str = Depends(oauth2_scheme),
    db: AsyncSession = Depends(get_db),
) -> User:
    """Get the current authenticated user from JWT access token."""
    token_data = decode_token(token, expected_type="access")
    if token_data is None:
        raise UnauthorizedError(detail="Could not validate credentials")

    # Check token revocation
    jti = token_data.get("jti")
    if jti and await _is_token_revoked(db, jti):
        raise UnauthorizedError(detail="Token has been revoked")

    # token_data is a dict with 'sub' key (user UUID as string)
    user_id = token_data.get("sub")
    if user_id is None:
        raise UnauthorizedError(detail="Invalid token payload")

    result = await db.execute(select(User).where(User.id == user_id))
    user = result.scalar_one_or_none()

    if user is None:
        raise UnauthorizedError(detail="User not found")
    if not user.is_active:
        raise ForbiddenError(detail="Inactive user")
    return user


async def get_current_user_with_permissions(
    token: str = Depends(oauth2_scheme),
    db: AsyncSession = Depends(get_db),
) -> User:
    """Get the current user with roles, groups, group roles, and permissions eagerly loaded."""
    token_data = decode_token(token, expected_type="access")
    if token_data is None:
        raise UnauthorizedError(detail="Could not validate credentials")

    # Check token revocation
    jti = token_data.get("jti")
    if jti and await _is_token_revoked(db, jti):
        raise UnauthorizedError(detail="Token has been revoked")

    user_id = token_data.get("sub")
    if user_id is None:
        raise UnauthorizedError(detail="Invalid token payload")

    from app.models.group import UserGroup

    result = await db.execute(
        select(User)
        .where(User.id == user_id)
        .options(
            selectinload(User.roles).selectinload(Role.permissions),
            selectinload(User.groups).selectinload(UserGroup.roles).selectinload(Role.permissions),
        )
    )
    user = result.scalar_one_or_none()

    if user is None:
        raise UnauthorizedError(detail="User not found")
    if not user.is_active:
        raise ForbiddenError(detail="Inactive user")
    return user


async def get_current_active_admin(
    current_user: User = Depends(get_current_user_with_permissions),
) -> User:
    """Ensure the current user has admin permission."""
    if not current_user.is_admin:
        raise ForbiddenError(detail="Admin privileges required")
    return current_user


def require_permission(permission: str) -> Callable:
    """Dependency factory: require a specific permission (or 'admin' wildcard).

    Usage:
        @router.get("/users/", dependencies=[Depends(require_permission("users.read"))])
    """

    async def _check(
        current_user: User = Depends(get_current_user_with_permissions),
    ) -> User:
        perm_names: set[str] = set()

        # Direct role permissions
        for role in current_user.roles:
            for p in role.permissions:
                perm_names.add(p.name)
                if p.name == "admin":
                    return current_user

        # Group-inherited role permissions
        for group in current_user.groups:
            for role in group.roles:
                for p in role.permissions:
                    perm_names.add(p.name)
                    if p.name == "admin":
                        return current_user

        if permission not in perm_names:
            raise ForbiddenError(
                detail=f"Missing required permission: {permission}"
            )
        return current_user

    return _check
