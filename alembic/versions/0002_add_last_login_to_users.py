"""Add last_login column to users table."""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = "0002"
down_revision: Union[str, None] = "0001"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Add last_login column to users table."""
    op.add_column(
        "users",
        sa.Column(
            "last_login",
            sa.TIMESTAMP(timezone=True),
            nullable=True,
        ),
    )
    op.create_index(op.f("ix_users_last_login"), "users", ["last_login"])


def downgrade() -> None:
    """Remove last_login column from users table."""
    op.drop_index(op.f("ix_users_last_login"), table_name="users")
    op.drop_column("users", "last_login")
