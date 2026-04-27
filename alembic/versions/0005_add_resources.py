"""Add resources table and FK from permissions.resource_id to resources.id."""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


revision: str = "0005"
down_revision: Union[str, None] = "0004"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None

SEEDED_RESOURCES = [
    ("users", "User management"),
    ("roles", "Role management"),
    ("permissions", "Permission management"),
    ("groups", "User group management"),
]


def upgrade() -> None:
    conn = op.get_bind()

    # 1. Create resources table
    op.create_table(
        "resources",
        sa.Column("id", sa.Integer(), primary_key=True, autoincrement=True),
        sa.Column("name", sa.String(50), nullable=False, unique=True),
        sa.Column("description", sa.String(255), nullable=True),
        sa.Column("created_at", sa.TIMESTAMP(timezone=True), nullable=False, server_default=sa.text("now()")),
        sa.Column("updated_at", sa.TIMESTAMP(timezone=True), nullable=False, server_default=sa.text("now()")),
    )
    op.create_index("ix_resources_name", "resources", ["name"])

    # 2. Seed default resources
    for name, desc in SEEDED_RESOURCES:
        conn.execute(
            sa.text(
                "INSERT INTO resources (name, description) "
                "VALUES (:name, :desc) ON CONFLICT (name) DO NOTHING"
            ),
            {"name": name, "desc": desc},
        )

    # 3. Add resource_id FK column to permissions (nullable — admin wildcard stays NULL)
    op.add_column(
        "permissions",
        sa.Column(
            "resource_id",
            sa.Integer(),
            sa.ForeignKey("resources.id", ondelete="CASCADE"),
            nullable=True,
        ),
    )
    op.create_index("ix_permissions_resource_id", "permissions", ["resource_id"])

    # 4. Backfill resource_id for existing permissions (skip admin wildcard resource="*")
    conn.execute(
        sa.text(
            "UPDATE permissions "
            "SET resource_id = (SELECT r.id FROM resources r WHERE r.name = permissions.resource) "
            "WHERE permissions.resource != '*'"
        )
    )


def downgrade() -> None:
    op.drop_index("ix_permissions_resource_id", "permissions")
    op.drop_column("permissions", "resource_id")
    op.drop_index("ix_resources_name", "resources")
    op.drop_table("resources")
