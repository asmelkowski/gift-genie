from __future__ import annotations

from datetime import datetime

from sqlalchemy import DateTime, Index, String, Text
from sqlalchemy.orm import Mapped, mapped_column

from gift_genie.infrastructure.database.models.base import Base
from gift_genie.libs.utils import utc_datetime_now


class PermissionModel(Base):
    """SQLAlchemy model for the permissions table."""

    __tablename__ = "permissions"

    code: Mapped[str] = mapped_column(String(100), primary_key=True)
    name: Mapped[str] = mapped_column(String(200), nullable=False)
    description: Mapped[str] = mapped_column(Text, nullable=False)
    category: Mapped[str] = mapped_column(String(50), nullable=False)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), nullable=False, default=utc_datetime_now
    )

    __table_args__ = (
        Index("idx_permissions_category", "category"),
        Index("idx_permissions_code", "code"),
    )
