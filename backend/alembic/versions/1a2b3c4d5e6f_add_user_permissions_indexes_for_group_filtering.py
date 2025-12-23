"""Add user permissions indexes for group filtering

Revision ID: 1a2b3c4d5e6f
Revises: 0f4ce5fbf7f9
Create Date: 2025-12-23 10:00:00.000000

"""

from collections.abc import Sequence

from alembic import op


revision: str = "1a2b3c4d5e6f"
down_revision: str | None = "0f4ce5fbf7f9"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    # Index for user_id + permission_code lookups (main query for group filtering)
    op.create_index(
        "idx_user_permissions_user_code",
        "user_permissions",
        ["user_id", "permission_code"],
    )


def downgrade() -> None:
    op.drop_index("idx_user_permissions_user_code", table_name="user_permissions")
