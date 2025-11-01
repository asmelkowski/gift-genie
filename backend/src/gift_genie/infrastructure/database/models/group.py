from __future__ import annotations

from datetime import datetime
from typing import TYPE_CHECKING
from uuid import UUID, uuid4

from sqlalchemy import Boolean, DateTime, ForeignKey, Index, Integer, Text
from sqlalchemy.orm import Mapped, mapped_column, relationship

from gift_genie.infrastructure.database.models.base import Base

from sqlalchemy.dialects.postgresql import UUID as PostgresUUID

from gift_genie.libs.utils import utc_datetime_now

if TYPE_CHECKING:
    from gift_genie.infrastructure.database.models.user import UserModel
    from gift_genie.infrastructure.database.models.member import MemberModel
    from gift_genie.infrastructure.database.models.exclusion import ExclusionModel
    from gift_genie.infrastructure.database.models.draw import DrawModel


class GroupModel(Base):
    __tablename__ = "groups"

    id: Mapped[UUID] = mapped_column(PostgresUUID(as_uuid=True), primary_key=True, default=uuid4)
    admin_user_id: Mapped[UUID] = mapped_column(
        PostgresUUID(as_uuid=True), ForeignKey("users.id", ondelete="CASCADE"), nullable=False
    )
    name: Mapped[str] = mapped_column(Text, nullable=False)
    historical_exclusions_enabled: Mapped[bool] = mapped_column(
        Boolean, nullable=False, default=True
    )
    historical_exclusions_lookback: Mapped[int] = mapped_column(Integer, nullable=False, default=1)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False, default=utc_datetime_now)
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), nullable=False, default=utc_datetime_now, onupdate=utc_datetime_now
    )

    admin_user: Mapped["UserModel"] = relationship("UserModel", back_populates="groups")
    members: Mapped[list["MemberModel"]] = relationship(
        "MemberModel", back_populates="group", cascade="all, delete-orphan"
    )
    exclusions: Mapped[list["ExclusionModel"]] = relationship(
        "ExclusionModel", back_populates="group", cascade="all, delete-orphan"
    )
    draws: Mapped[list["DrawModel"]] = relationship(
        "DrawModel", back_populates="group", cascade="all, delete-orphan"
    )

    __table_args__ = (Index("idx_groups_admin_user_id", "admin_user_id"),)
