from __future__ import annotations

from datetime import datetime
from typing import TYPE_CHECKING
from uuid import UUID, uuid4

from sqlalchemy import Boolean, DateTime, ForeignKey, Index, Text, func, text
from sqlalchemy.orm import Mapped, mapped_column, relationship

from sqlalchemy.dialects.postgresql import UUID as PostgresUUID
from gift_genie.infrastructure.database.models.base import Base
from gift_genie.libs.utils import utc_datetime_now

if TYPE_CHECKING:
    from gift_genie.infrastructure.database.models.group import GroupModel
    from gift_genie.infrastructure.database.models.exclusion import ExclusionModel
    from gift_genie.infrastructure.database.models.assignment import AssignmentModel


class MemberModel(Base):
    __tablename__ = "members"

    id: Mapped[UUID] = mapped_column(PostgresUUID(as_uuid=True), primary_key=True, default=uuid4)
    group_id: Mapped[UUID] = mapped_column(
        PostgresUUID(as_uuid=True), ForeignKey("groups.id", ondelete="CASCADE"), nullable=False
    )
    name: Mapped[str] = mapped_column(Text, nullable=False)
    email: Mapped[str | None] = mapped_column(Text, nullable=True)
    language: Mapped[str | None] = mapped_column(Text, nullable=True, default=None)
    is_active: Mapped[bool] = mapped_column(Boolean, nullable=False, default=True)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), nullable=False, default=utc_datetime_now
    )

    group: Mapped["GroupModel"] = relationship("GroupModel", back_populates="members")
    exclusions_as_giver: Mapped[list["ExclusionModel"]] = relationship(
        "ExclusionModel",
        foreign_keys="ExclusionModel.giver_member_id",
        back_populates="giver_member",
        cascade="all, delete-orphan",
    )
    exclusions_as_receiver: Mapped[list["ExclusionModel"]] = relationship(
        "ExclusionModel",
        foreign_keys="ExclusionModel.receiver_member_id",
        back_populates="receiver_member",
        cascade="all, delete-orphan",
    )
    assignments_as_giver: Mapped[list["AssignmentModel"]] = relationship(
        "AssignmentModel",
        foreign_keys="AssignmentModel.giver_member_id",
        back_populates="giver_member",
        cascade="all, delete-orphan",
    )
    assignments_as_receiver: Mapped[list["AssignmentModel"]] = relationship(
        "AssignmentModel",
        foreign_keys="AssignmentModel.receiver_member_id",
        back_populates="receiver_member",
        cascade="all, delete-orphan",
    )

    __table_args__ = (
        Index("idx_members_group_id", "group_id"),
        Index(
            "idx_members_group_email_lower",
            "group_id",
            func.lower(email),
            postgresql_where=text("email IS NOT NULL"),
        ),
        Index(
            "idx_members_group_active",
            "group_id",
            postgresql_where=text("is_active = true"),
        ),
    )
