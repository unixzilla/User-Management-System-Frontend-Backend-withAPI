"""Add permissions and role_permissions tables."""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


revision: str = "0003"
down_revision: Union[str, None] = "0002"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


PERMISSIONS = [
    # (name, description, resource, action)
    ("users.read", "View user list and details", "users", "read"),
    ("users.write", "Create and update users", "users", "write"),
    ("users.delete", "Delete users", "users", "delete"),
    ("roles.read", "View roles", "roles", "read"),
    ("roles.write", "Create and update roles", "roles", "write"),
    ("roles.delete", "Delete roles", "roles", "delete"),
    ("permissions.read", "View permissions", "permissions", "read"),
    ("permissions.write", "Manage permissions", "permissions", "write"),
    ("groups.read", "View user groups", "groups", "read"),
    ("groups.write", "Create and update groups", "groups", "write"),
    ("groups.delete", "Delete groups", "groups", "delete"),
    ("admin", "Full administrative access", "*", "*"),
]

ROLE_PERMISSION_MAP = {
    "admin": ["admin"],
    "editor": ["users.read", "users.write", "roles.read", "permissions.read", "groups.read"],
    "viewer": ["users.read", "roles.read", "permissions.read", "groups.read"],
}


def upgrade() -> None:
    conn = op.get_bind()

    # Create permissions table
    op.create_table(
        "permissions",
        sa.Column("id", sa.Integer(), primary_key=True, autoincrement=True),
        sa.Column("name", sa.String(100), nullable=False, unique=True),
        sa.Column("description", sa.String(255), nullable=True),
        sa.Column("resource", sa.String(50), nullable=False),
        sa.Column("action", sa.String(50), nullable=False),
    )
    op.create_index("ix_permissions_name", "permissions", ["name"])
    op.create_index("ix_permissions_resource_action", "permissions", ["resource", "action"])

    # Create role_permissions join table
    op.create_table(
        "role_permissions",
        sa.Column("role_id", sa.Integer(), sa.ForeignKey("roles.id", ondelete="CASCADE"), primary_key=True),
        sa.Column("permission_id", sa.Integer(), sa.ForeignKey("permissions.id", ondelete="CASCADE"), primary_key=True),
        sa.Column("granted_at", sa.TIMESTAMP(timezone=True), nullable=False, server_default=sa.text("now()")),
    )

    # Seed permissions
    perm_ids = {}
    for name, desc, resource, action in PERMISSIONS:
        result = conn.execute(
            sa.text(
                "INSERT INTO permissions (name, description, resource, action) "
                "VALUES (:name, :desc, :resource, :action) "
                "ON CONFLICT (name) DO NOTHING RETURNING id"
            ),
            {"name": name, "desc": desc, "resource": resource, "action": action},
        )
        row = result.fetchone()
        if row:
            perm_ids[name] = row[0]
        else:
            # Already exists, fetch id
            r = conn.execute(sa.text("SELECT id FROM permissions WHERE name = :name"), {"name": name})
            perm_ids[name] = r.scalar_one()

    # Seed role-permission assignments
    for role_name, perm_names in ROLE_PERMISSION_MAP.items():
        r = conn.execute(sa.text("SELECT id FROM roles WHERE name = :name"), {"name": role_name})
        role_row = r.fetchone()
        if role_row is None:
            continue
        role_id = role_row[0]
        for pname in perm_names:
            pid = perm_ids.get(pname)
            if pid is None:
                continue
            conn.execute(
                sa.text(
                    "INSERT INTO role_permissions (role_id, permission_id) "
                    "VALUES (:role_id, :perm_id) ON CONFLICT DO NOTHING"
                ),
                {"role_id": role_id, "perm_id": pid},
            )


def downgrade() -> None:
    op.drop_table("role_permissions")
    op.drop_table("permissions")
