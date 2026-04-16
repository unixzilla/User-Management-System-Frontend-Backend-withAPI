"""Integration tests for user endpoints."""
import pytest
from fastapi import status
from app.core.security import create_access_token

pytestmark = pytest.mark.asyncio


class TestUserEndpoints:
    """Integration test suite for /api/v1/users endpoints."""

    async def test_list_users_as_admin(self, async_client, make_user, make_admin_token):
        """GET /users returns list when authenticated as admin."""
        await make_user()
        await make_user()  # Create 2 users

        token = make_admin_token()
        response = await async_client.get(
            "/api/v1/users/",
            headers={"Authorization": f"Bearer {token}"},
        )

        assert response.status_code == 200
        users = response.json()
        assert isinstance(users, list)
        assert len(users) >= 2

    async def test_list_users_unauthorized(self, async_client):
        """GET /users without auth returns 401."""
        response = await async_client.get("/api/v1/users/")
        assert response.status_code == 401

    async def test_create_user_as_admin(self, async_client, make_admin_token, make_role):
        """POST /users creates user when authenticated as admin."""
        token = make_admin_token()

        # Ensure admin role exists
        await make_role(name="admin")

        response = await async_client.post(
            "/api/v1/users/",
            headers={"Authorization": f"Bearer {token}"},
            json={
                "email": "newuser@example.com",
                "username": "newuser",
                "password": "SecurePass123!",
                "full_name": "New User",
            },
        )

        assert response.status_code == 201
        data = response.json()
        assert data["email"] == "newuser@example.com"
        assert data["username"] == "newuser"
        assert "id" in data
        assert "hashed_password" not in data  # Never exposed

    async def test_create_user_duplicate_email_conflict(self, async_client, make_user, make_admin_token):
        """POST /users with duplicate email returns 409."""
        await make_user(email="duplicate@example.com", username="user1")
        token = make_admin_token()

        response = await async_client.post(
            "/api/v1/users/",
            headers={"Authorization": f"Bearer {token}"},
            json={
                "email": "duplicate@example.com",
                "username": "user2",
                "password": "SecurePass123!",
            },
        )

        assert response.status_code == 409

    async def test_get_own_user(self, async_client, make_user):
        """GET /users/{id} returns own profile."""
        user = await make_user(email="self@example.com", username="selfuser")
        token = create_access_token(subject=str(user.id))

        response = await async_client.get(
            f"/api/v1/users/{user.id}",
            headers={"Authorization": f"Bearer {token}"},
        )

        assert response.status_code == 200
        data = response.json()
        assert data["email"] == user.email

    async def test_get_other_user_as_regular_user_forbidden(self, async_client, make_user):
        """GET /users/{id} as non-admin on other user returns 403."""
        user1 = await make_user(email="user1@example.com", username="user1")
        user2 = await make_user(email="user2@example.com", username="user2")

        token1 = create_access_token(subject=str(user1.id))

        response = await async_client.get(
            f"/api/v1/users/{user2.id}",
            headers={"Authorization": f"Bearer {token1}"},
        )

        assert response.status_code == 403

    async def test_get_user_as_admin_success(self, async_client, make_user, make_admin_token):
        """Admin can view any user."""
        user = await make_user(email="target@example.com", username="target")
        token = make_admin_token()

        response = await async_client.get(
            f"/api/v1/users/{user.id}",
            headers={"Authorization": f"Bearer {token}"},
        )

        assert response.status_code == 200

    async def test_update_own_user(self, async_client, make_user):
        """PATCH /users/{id} updates own profile."""
        user = await make_user(email="update@example.com", username="updateme", full_name="Old Name")
        token = create_access_token(subject=str(user.id))

        response = await async_client.patch(
            f"/api/v1/users/{user.id}",
            headers={"Authorization": f"Bearer {token}"},
            json={"full_name": "New Name"},
        )

        assert response.status_code == 200
        assert response.json()["full_name"] == "New Name"

    async def test_update_user_not_found(self, async_client, make_admin_token):
        """PATCH /users/{id} with non-existent user returns 404."""
        token = make_admin_token()
        fake_id = "12345678-1234-5678-1234-567812345678"

        response = await async_client.patch(
            f"/api/v1/users/{fake_id}",
            headers={"Authorization": f"Bearer {token}"},
            json={"email": "new@example.com"},
        )

        assert response.status_code == 404

    async def test_delete_user_as_admin(self, async_client, make_user, make_admin_token):
        """DELETE /users/{id} soft-deletes user."""
        await make_user(email="todelete@example.com", username="todelete")
        token = make_admin_token()
        user_list = await async_client.get("/api/v1/users/", headers={"Authorization": f"Bearer {token}"})
        user_id = user_list.json()[0]["id"]

        response = await async_client.delete(
            f"/api/v1/users/{user_id}",
            headers={"Authorization": f"Bearer {token}"},
        )

        assert response.status_code == 200

    async def test_delete_other_user_unauthorized(self, async_client, make_user):
        """DELETE /users/{id} as non-admin returns 403."""
        owner = await make_user(email="owner@example.com", username="owner")
        target = await make_user(email="target@example.com", username="target")

        token_owner = create_access_token(subject=str(owner.id))

        response = await async_client.delete(
            f"/api/v1/users/{target.id}",
            headers={"Authorization": f"Bearer {token_owner}"},
        )

        assert response.status_code == 403

    async def test_assign_role_to_user(self, async_client, make_user, make_role, make_admin_token):
        """POST /users/{id}/roles assigns role to user."""
        user = await make_user(email="assign@example.com", username="assignme")
        role = await make_role(name="editor")
        token = make_admin_token()

        response = await async_client.post(
            f"/api/v1/users/{user.id}/roles",
            headers={"Authorization": f"Bearer {token}"},
            params={"role_id": role.id},
        )

        assert response.status_code == 200

    async def test_assign_role_already_assigned(self, async_client, make_user, make_role, make_admin_token, test_db_session):
        """Assigning already-assigned role returns 409."""
        from app.crud.user import user as user_crud
        user = await make_user(email="already@example.com", username="already")
        role = await make_role(name="viewer")
        token = make_admin_token()

        # Assign role manually
        await user_crud.assign_role(test_db_session, user_id=user.id, role_id=role.id)

        response = await async_client.post(
            f"/api/v1/users/{user.id}/roles",
            headers={"Authorization": f"Bearer {token}"},
            params={"role_id": role.id},
        )

        assert response.status_code == 409

    async def test_remove_role_from_user(self, async_client, make_user, make_role, make_admin_token):
        """DELETE /users/{id}/roles/{role_id} removes role."""
        user = await make_user(email="remove@example.com", username="removeme")
        role = await make_role(name="viewer")
        token = make_admin_token()

        # First assign
        await async_client.post(
            f"/api/v1/users/{user.id}/roles",
            headers={"Authorization": f"Bearer {token}"},
            params={"role_id": role.id},
        )

        # Then remove
        response = await async_client.delete(
            f"/api/v1/users/{user.id}/roles/{role.id}",
            headers={"Authorization": f"Bearer {token}"},
        )

        assert response.status_code == 200

    async def test_pagination(self, async_client, make_user, make_admin_token):
        """GET /users with pagination params works."""
        for i in range(5):
            await make_user(email=f"page{i}@example.com", username=f"page{i}")

        token = make_admin_token()

        response = await async_client.get(
            "/api/v1/users/",
            headers={"Authorization": f"Bearer {token}"},
            params={"skip": 2, "limit": 2},
        )

        assert response.status_code == 200
        assert len(response.json()) <= 2
