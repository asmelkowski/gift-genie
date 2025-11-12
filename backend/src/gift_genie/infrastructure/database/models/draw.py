from __future__ import annotations

from datetime import datetime
from typing import TYPE_CHECKING
from uuid import UUID, uuid4

from sqlalchemy import DateTime, ForeignKey, Index
from sqlalchemy.orm import Mapped, mapped_column, relationship
from sqlalchemy.dialects.postgresql import ENUM, UUID as PostgresUUID

from gift_genie.domain.entities import DrawStatus
from gift_genie.infrastructure.database.models.base import Base
from gift_genie.libs.utils import utc_datetime_now

if TYPE_CHECKING:
    from gift_genie.infrastructure.database.models.group import GroupModel
    from gift_genie.infrastructure.database.models.assignment import AssignmentModel


class DrawModel(Base):
    __tablename__ = "draws"

    id: Mapped[UUID] = mapped_column(PostgresUUID(as_uuid=True), primary_key=True, default=uuid4)
    group_id: Mapped[UUID] = mapped_column(
        PostgresUUID(as_uuid=True), ForeignKey("groups.id", ondelete="CASCADE"), nullable=False
    )
    status: Mapped[DrawStatus] = mapped_column(
        ENUM(DrawStatus, name="draw_status_enum"), nullable=False, default=DrawStatus.PENDING
    )
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), nullable=False, default=utc_datetime_now
    )
    finalized_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    notification_sent_at: Mapped[datetime | None] = mapped_column(
        DateTime(timezone=True), nullable=True
    )

    group: Mapped["GroupModel"] = relationship("GroupModel", back_populates="draws")
    assignments: Mapped[list["AssignmentModel"]] = relationship(
        "AssignmentModel", back_populates="draw", cascade="all, delete-orphan"
    )

    __table_args__ = (
        Index("idx_draws_group_id", "group_id"),
        Index("idx_draws_group_status", "group_id", "status"),
    )
