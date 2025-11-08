from __future__ import annotations

from datetime import datetime
from typing import TYPE_CHECKING
from uuid import UUID, uuid4

from sqlalchemy import DateTime, Index, Text, func
from sqlalchemy.orm import Mapped, mapped_column, relationship
from sqlalchemy.dialects.postgresql import UUID as PostgresUUID
from gift_genie.infrastructure.database.models.base import Base
from gift_genie.libs.utils import utc_datetime_now

if TYPE_CHECKING:
    from gift_genie.infrastructure.database.models.group import GroupModel
    from gift_genie.infrastructure.database.models.exclusion import ExclusionModel


class UserModel(Base):
    __tablename__ = "users"
    id: Mapped[UUID] = mapped_column(PostgresUUID(as_uuid=True), primary_key=True, default=uuid4)
    email: Mapped[str] = mapped_column(Text, nullable=False)
    password_hash: Mapped[str] = mapped_column(Text, nullable=False)
    name: Mapped[str] = mapped_column(Text, nullable=False)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), nullable=False, default=utc_datetime_now
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), nullable=False, default=utc_datetime_now, onupdate=utc_datetime_now
    )

    groups: Mapped[list["GroupModel"]] = relationship(
        "GroupModel", back_populates="admin_user", cascade="all, delete-orphan"
    )
    created_exclusions: Mapped[list["ExclusionModel"]] = relationship(
        "ExclusionModel", back_populates="created_by_user"
    )

    __table_args__ = (Index("idx_users_email_lower", func.lower(email), unique=True),)
