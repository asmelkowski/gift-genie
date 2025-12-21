from __future__ import annotations

from datetime import datetime
from typing import TYPE_CHECKING
from uuid import UUID

from sqlalchemy import DateTime, ForeignKey, Index, String
from sqlalchemy.dialects.postgresql import UUID as PostgresUUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from gift_genie.infrastructure.database.models.base import Base
from gift_genie.libs.utils import utc_datetime_now

if TYPE_CHECKING:
    from gift_genie.infrastructure.database.models.permission import PermissionModel
    from gift_genie.infrastructure.database.models.user import UserModel


class UserPermissionModel(Base):
    """SQLAlchemy model for the user_permissions junction table.

    Maps users to their granted permissions with audit information.
    """

    __tablename__ = "user_permissions"

    user_id: Mapped[UUID] = mapped_column(
        PostgresUUID(as_uuid=True),
        ForeignKey("users.id", ondelete="CASCADE"),
        primary_key=True,
    )
    permission_code: Mapped[str] = mapped_column(
        String(100),
        ForeignKey("permissions.code", ondelete="CASCADE"),
        primary_key=True,
    )
    granted_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), nullable=False, default=utc_datetime_now
    )
    granted_by: Mapped[UUID | None] = mapped_column(
        PostgresUUID(as_uuid=True),
        ForeignKey("users.id", ondelete="SET NULL"),
        nullable=True,
    )

    # Relationships
    user: Mapped["UserModel"] = relationship("UserModel", foreign_keys=[user_id])
    permission: Mapped["PermissionModel"] = relationship("PermissionModel")
    granted_by_user: Mapped["UserModel | None"] = relationship(
        "UserModel", foreign_keys=[granted_by]
    )

    __table_args__ = (
        Index("idx_user_permissions_user_id", "user_id"),
        Index("idx_user_permissions_permission_code", "permission_code"),
    )
