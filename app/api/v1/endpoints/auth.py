"""Authentication endpoints: login, refresh, logout."""
from typing import Annotated
from datetime import datetime, timezone

from fastapi import APIRouter, Depends, HTTPException, Request, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.db.postgres import get_async_session
from app.core.security import create_access_token, create_refresh_token, decode_token
from app.services.user_service import user_service
from app.schemas.token import TokenPair
from app.schemas.user import UserCreate, UserLogin
from app.models.user import User
from app.models.token_blocklist import TokenBlocklist
from app.dependencies import oauth2_scheme, get_current_user, get_db
from app.core.exceptions import UnauthorizedError, ForbiddenError

router = APIRouter(prefix="/auth", tags=["authentication"])


@router.post("/login", response_model=TokenPair)
async def login(
    request: Request,
    user_in: UserLogin,
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

    # Update last login timestamp
    from datetime import datetime, timezone
    user.last_login = datetime.now(timezone.utc)
    await db.flush()
    await db.refresh(user)

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
    Exchange a valid refresh token for a new token pair (rotation).
    The old refresh token is revoked.
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

    # Revoke the old refresh token
    old_jti = payload.get("jti")
    old_exp = payload.get("exp")
    if old_jti and old_exp:
        db.add(TokenBlocklist(
            jti=old_jti,
            user_id=user_id,
            expires_at=datetime.fromtimestamp(old_exp, tz=timezone.utc),
        ))

    # Verify user exists and is active
    user = await user_service.user_crud.get(db, user_id)
    if not user or not user.is_active:
        raise UnauthorizedError(detail="User not found or inactive")

    # Issue new tokens
    access_token = create_access_token(subject=str(user.id))
    new_refresh_token = create_refresh_token(subject=str(user.id))

    await db.commit()

    return TokenPair(
        access_token=access_token,
        refresh_token=new_refresh_token,
    )


@router.post("/logout")
async def logout(
    current_user: Annotated[User, Depends(get_current_user)],
    request: Request,
    db: Annotated[AsyncSession, Depends(get_db)],
) -> dict:
    """
    Logout the current user. Revokes the provided refresh token.
    """
    # Extract and revoke the refresh token from the request body or header
    auth_header = request.headers.get("Authorization", "")
    if auth_header.startswith("Bearer "):
        token = auth_header[7:]
        payload = decode_token(token)  # Don't enforce type — accept both
        if payload:
            jti = payload.get("jti")
            exp = payload.get("exp")
            if jti and exp:
                db.add(TokenBlocklist(
                    jti=jti,
                    user_id=str(current_user.id),
                    expires_at=datetime.fromtimestamp(exp, tz=timezone.utc),
                ))
                await db.commit()

    await user_service.audit_service.log(
        event_type="logout",
        actor_id=current_user.id,
        target_id=current_user.id,
        payload={"email": current_user.email},
        ip_address=request.client.host if request.client else None,
        user_agent=request.headers.get("User-Agent"),
    )

    return {"message": "Logged out successfully"}
