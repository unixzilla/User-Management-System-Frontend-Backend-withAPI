"""Authentication endpoints: login, refresh, logout."""
from typing import Annotated

from fastapi import APIRouter, Depends, HTTPException, Request, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.db.postgres import get_async_session
from app.core.security import create_access_token, create_refresh_token, decode_token
from app.services.user_service import user_service
from app.schemas.token import TokenPair
from app.schemas.user import UserCreate
from app.models.user import User
from app.dependencies import oauth2_scheme, get_current_user, get_db
from app.core.exceptions import UnauthorizedError, ForbiddenError

router = APIRouter(prefix="/auth", tags=["authentication"])


@router.post("/login", response_model=TokenPair)
async def login(
    request: Request,
    user_in: UserCreate,
    db: Annotated[AsyncSession, Depends(get_db)],
) -> TokenPair:
    """
    Authenticate a user and return access + refresh tokens.

    Password is sent in the request body (use HTTPS in production).
    """
    # Authenticate
    user = await user_service.user_crud.authenticate(
        db, email=user_in.email, password=user_in.password
    )

    if not user:
        # Audit failed login
        await user_service.audit_service.log(
            event_type="login.failed",
            actor_id=None,
            target_id=None,
            payload={"attempted_email": user_in.email},
            ip_address=request.client.host if request.client else None,
            user_agent=request.headers.get("User-Agent"),
        )
        raise UnauthorizedError(detail="Incorrect email or password")

    if not user.is_active:
        raise ForbiddenError(detail="User account is disabled")

    # Create tokens
    access_token = create_access_token(subject=str(user.id))
    refresh_token = create_refresh_token(subject=str(user.id))

    # Audit successful login
    await user_service.audit_service.log(
        event_type="login.success",
        actor_id=user.id,
        target_id=user.id,
        payload={"email": user.email},
        ip_address=request.client.host if request.client else None,
        user_agent=request.headers.get("User-Agent"),
    )

    return TokenPair(
        access_token=access_token,
        refresh_token=refresh_token,
    )


@router.post("/refresh", response_model=TokenPair)
async def refresh(
    request: Request,
    db: Annotated[AsyncSession, Depends(get_db)],
) -> TokenPair:
    """
    Exchange a valid refresh token for a new access token.
    """
    token = await oauth2_scheme(request)

    if not token:
        raise UnauthorizedError(detail="Refresh token required")

    payload = decode_token(token)
    if payload is None:
        raise UnauthorizedError(detail="Invalid refresh token")

    if payload.get("type") != "refresh":
        raise UnauthorizedError(detail="Not a refresh token")

    user_id = payload.get("sub")
    if not user_id:
        raise UnauthorizedError(detail="Token missing subject")

    # Verify user exists and is active
    user = await user_service.user_crud.get(db, user_id)
    if not user or not user.is_active:
        raise UnauthorizedError(detail="User not found or inactive")

    # Issue new tokens
    access_token = create_access_token(subject=str(user.id))
    new_refresh_token = create_refresh_token(subject=str(user.id))

    return TokenPair(
        access_token=access_token,
        refresh_token=new_refresh_token,
    )


@router.post("/logout")
async def logout(
    current_user: Annotated[User, Depends(get_current_user)],
    request: Request,
) -> dict:
    """
    Logout the current user.

    In production, the refresh token would be added to a blocklist.
    """
    await user_service.audit_service.log(
        event_type="logout",
        actor_id=current_user.id,
        target_id=current_user.id,
        payload={"email": current_user.email},
        ip_address=request.client.host if request.client else None,
        user_agent=request.headers.get("User-Agent"),
    )

    return {"message": "Logged out successfully"}
