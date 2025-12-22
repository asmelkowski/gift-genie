"""remove foreign key from user_permissions.permission_code

Revision ID: 0f4ce5fbf7f9
Revises: 19f057918b6f
Create Date: 2025-12-19 19:35:00.000000

"""

from collections.abc import Sequence

from alembic import op


revision: str = "0f4ce5fbf7f9"
down_revision: str | None = "19f057918b6f"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    """Remove foreign key constraint from user_permissions.permission_code.

    Resource-scoped permissions (e.g., 'groups:read:{group_id}') are dynamically
    generated and do not exist in the permissions table. The foreign key constraint
    prevents auto-granting these permissions when users create groups.
    """
    # Drop the foreign key constraint
    op.drop_constraint(
        "user_permissions_permission_code_fkey", "user_permissions", type_="foreignkey"
    )


def downgrade() -> None:
    """Re-add foreign key constraint to user_permissions.permission_code."""
    # WARNING: This will fail if there are resource-scoped permissions in the table
    op.create_foreign_key(
        "user_permissions_permission_code_fkey",
        "user_permissions",
        "permissions",
        ["permission_code"],
        ["code"],
        ondelete="CASCADE",
    )
