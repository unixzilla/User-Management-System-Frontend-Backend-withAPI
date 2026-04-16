"""Integration tests for role endpoints."""
import pytest
from fastapi import status

pytestmark = pytest.mark.asyncio


class TestRoleEndpoints:
    """Integration test suite for /api/v1/roles endpoints."""

    async def test_list_roles_as_admin(self, async_client, make_role, make_admin_token):
        """GET /roles returns list when authenticated as admin."""
        await make_role(name="admin")
        await make_role(name="editor")
        token = make_admin_token()

        response = await async_client.get(
            "/api/v1/roles/",
            headers={"Authorization": f"Bearer {token}"},
        )

        assert response.status_code == 200
        roles = response.json()
        assert isinstance(roles, list)
        assert len(roles) >= 2

    async def test_create_role_as_admin(self, async_client, make_admin_token):
        """POST /roles creates new role."""
        token = make_admin_token()

        response = await async_client.post(
            "/api/v1/roles/",
            headers={"Authorization": f"Bearer {token}"},
            json={"name": "custom_role", "description": "A custom role"},
        )

        assert response.status_code == 201
        data = response.json()
        assert data["name"] == "custom_role"
        assert data["description"] == "A custom role"

    async def test_create_role_duplicate_name(self, async_client, make_role, make_admin_token):
        """POST /roles with duplicate name returns 409 or 400."""
        await make_role(name="duplicatorole")
        token = make_admin_token()

        response = await async_client.post(
            "/api/v1/roles/",
            headers={"Authorization": f"Bearer {token}"},
            json={"name": "duplicatorole", "description": "Another"},
        )

        # Either 400 or 409 indicates proper duplicate handling
        assert response.status_code in [400, 409]

    async def test_delete_role_as_admin(self, async_client, make_role, make_admin_token):
        """DELETE /roles/{id} removes role."""
        role = await make_role(name="deleteme")
        token = make_admin_token()

        response = await async_client.delete(
            f"/api/v1/roles/{role.id}",
            headers={"Authorization": f"Bearer {token}"},
        )

        assert response.status_code == 200
        assert response.json()["message"] == "Role deleted successfully"

    async def test_delete_role_with_assigned_users_fails(
        self, async_client, make_user, make_role, make_admin_token, test_db_session
    ):
        """DELETE /roles/{id} fails if role assigned to any user."""
        from app.crud.user import user as user_crud

        user = await make_user(email="hasrole@example.com", username="hasrole")
        role = await make_role(name="assigned_role")
        token = make_admin_token()

        # Assign role to user via CRUD
        await user_crud.assign_role(test_db_session, user_id=user.id, role_id=role.id)

        response = await async_client.delete(
            f"/api/v1/roles/{role.id}",
            headers={"Authorization": f"Bearer {token}"},
        )

        assert response.status_code == 409
        assert "assigned" in response.json()["detail"].lower()

    async def test_delete_nonexistent_role(self, async_client, make_admin_token):
        """DELETE /roles/{id} with non-existent ID returns 404."""
        token = make_admin_token()
        fake_id = 99999

        response = await async_client.delete(
            f"/api/v1/roles/{fake_id}",
            headers={"Authorization": f"Bearer {token}"},
        )

        assert response.status_code == 404

    async def test_role_endpoints_unauthorized(self, async_client):
        """Role endpoints without auth return 401."""
        response = await async_client.get("/api/v1/roles/")
        assert response.status_code == 401

        response = await async_client.post("/api/v1/roles/", json={"name": "test"})
        assert response.status_code == 401
