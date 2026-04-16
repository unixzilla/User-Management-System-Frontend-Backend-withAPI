"""Integration tests for authentication endpoints."""
import pytest
from fastapi import status

pytestmark = pytest.mark.asyncio


class TestAuthEndpoints:
    """Integration test suite for /api/v1/auth endpoints."""

    async def test_login_success(self, async_client, make_user):
        """POST /auth/login with valid credentials returns tokens."""
        user = await make_user(email="auth@example.com", username="authuser", password="secret123")

        response = await async_client.post(
            "/api/v1/auth/login",
            json={"email": user.email, "password": "secret123"},
        )

        assert response.status_code == 200
        data = response.json()
        assert "access_token" in data
        assert "refresh_token" in data
        assert data["token_type"] == "bearer"

    async def test_login_invalid_password(self, async_client, make_user):
        """POST /auth/login with wrong password returns 401."""
        await make_user(email="auth@example.com", username="authuser", password="secret123")

        response = await async_client.post(
            "/api/v1/auth/login",
            json={"email": "auth@example.com", "password": "wrongpassword"},
        )

        assert response.status_code == 401
        assert response.json()["detail"] == "Incorrect email or password"

    async def test_login_nonexistent_user(self, async_client):
        """POST /auth/login with non-existent email returns 401."""
        response = await async_client.post(
            "/api/v1/auth/login",
            json={"email": "nonexistent@example.com", "password": "any"},
        )
        assert response.status_code == 401

    async def test_login_inactive_user(self, async_client, make_user, test_db_session):
        """POST /auth/login with inactive user returns 403."""
        user = await make_user(email="inactive@example.com", username="inactive", password="secret123", is_active=False)

        response = await async_client.post(
            "/api/v1/auth/login",
            json={"email": user.email, "password": "secret123"},
        )

        assert response.status_code == 403
        assert response.json()["detail"] == "User account is disabled"

    async def test_refresh_token(self, async_client, make_user):
        """POST /auth/refresh with valid refresh token returns new tokens."""
        from app.core.security import create_refresh_token
        user = await make_user(email="refresh@example.com", username="refreshuser", password="secret123")
        refresh = create_refresh_token(subject=str(user.id))

        response = await async_client.post(
            "/api/v1/auth/refresh",
            headers={"Authorization": f"Bearer {refresh}"},
        )

        assert response.status_code == 200
        data = response.json()
        assert "access_token" in data
        assert "refresh_token" in data

    async def test_refresh_invalid_token(self, async_client):
        """POST /auth/refresh with invalid token returns 401."""
        response = await async_client.post(
            "/api/v1/auth/refresh",
            headers={"Authorization": "Bearer invalidtoken123"},
        )
        assert response.status_code == 401

    async def test_refresh_access_token_type_fails(self, async_client, make_user):
        """POST /auth/refresh with access token returns 401."""
        from app.core.security import create_access_token
        user = await make_user(email="refresh@example.com", username="refreshuser")
        access = create_access_token(subject=str(user.id))

        response = await async_client.post(
            "/api/v1/auth/refresh",
            headers={"Authorization": f"Bearer {access}"},
        )
        assert response.status_code == 401
        assert "refresh" in response.json()["detail"].lower()

    async def test_logout(self, async_client, make_user):
        """POST /auth/logout returns success (auth required)."""
        from app.core.security import create_access_token
        user = await make_user(email="logout@example.com", username="logoutuser")
        token = create_access_token(subject=str(user.id))

        response = await async_client.post(
            "/api/v1/auth/logout",
            headers={"Authorization": f"Bearer {token}"},
        )

        assert response.status_code == 200
        assert response.json()["message"] == "Logged out successfully"

    async def test_logout_unauthorized(self, async_client):
        """POST /auth/logout without token returns 401."""
        response = await async_client.post("/api/v1/auth/logout")
        assert response.status_code == 401
