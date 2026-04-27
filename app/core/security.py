"""Security utilities: password hashing, JWT tokens."""
from datetime import datetime, timedelta, timezone
from typing import Optional

from jose import JWTError, jwt
from passlib.context import CryptContext

from app.config import settings

pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")


def hash_password(password: str) -> str:
    """Hash a password using bcrypt."""
    return pwd_context.hash(password)


def verify_password(plain_password: str, hashed_password: str) -> bool:
    """Verify a password against its hash."""
    return pwd_context.verify(plain_password, hashed_password)


def create_access_token(
    subject: str,
    expires_delta: Optional[timedelta] = None,
    extra: dict | None = None,
) -> str:
    """Create a JWT access token (type=access, 15 min expiry)."""
    if expires_delta:
        expire = datetime.now(timezone.utc) + expires_delta
    else:
        expire = datetime.now(timezone.utc) + timedelta(
            minutes=settings.access_token_expire_minutes
        )

    to_encode = {"sub": subject, "exp": expire, "type": "access", "jti": _generate_jti()}
    if extra:
        to_encode.update(extra)
    return jwt.encode(to_encode, settings.secret_key, algorithm=settings.algorithm)


def create_refresh_token(subject: str) -> str:
    """Create a JWT refresh token (type=refresh, 7-day expiry)."""
    expire = datetime.now(timezone.utc) + timedelta(
        days=settings.refresh_token_expire_days
    )
    to_encode = {
        "sub": subject,
        "exp": expire,
        "type": "refresh",
        "jti": _generate_jti(),
    }
    return jwt.encode(to_encode, settings.secret_key, algorithm=settings.algorithm)


def decode_token(token: str, expected_type: Optional[str] = None) -> Optional[dict]:
    """Decode and validate a JWT token. Optionally enforce token type."""
    try:
        payload = jwt.decode(
            token, settings.secret_key, algorithms=[settings.algorithm]
        )
        if expected_type and payload.get("type") != expected_type:
            return None
        return payload
    except JWTError:
        return None


def _generate_jti() -> str:
    """Generate a unique JWT ID."""
    import uuid
    return str(uuid.uuid4())
