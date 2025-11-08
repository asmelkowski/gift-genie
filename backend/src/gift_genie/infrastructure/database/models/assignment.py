from __future__ import annotations

from datetime import datetime
from typing import TYPE_CHECKING
from uuid import UUID, uuid4

from sqlalchemy import CheckConstraint, DateTime, ForeignKey, Index, Text, UniqueConstraint
from sqlalchemy.orm import Mapped, mapped_column, relationship

from gift_genie.infrastructure.database.models.base import Base
from sqlalchemy.dialects.postgresql import UUID as PostgresUUID

from gift_genie.libs.utils import utc_datetime_now

if TYPE_CHECKING:
    from gift_genie.infrastructure.database.models.draw import DrawModel
    from gift_genie.infrastructure.database.models.member import MemberModel


class AssignmentModel(Base):
    __tablename__ = "assignments"

    id: Mapped[UUID] = mapped_column(PostgresUUID(as_uuid=True), primary_key=True, default=uuid4)
    draw_id: Mapped[UUID] = mapped_column(
        PostgresUUID(as_uuid=True), ForeignKey("draws.id", ondelete="CASCADE"), nullable=False
    )
    giver_member_id: Mapped[UUID] = mapped_column(
        PostgresUUID(as_uuid=True), ForeignKey("members.id", ondelete="CASCADE"), nullable=False
    )
    receiver_member_id: Mapped[UUID] = mapped_column(
        PostgresUUID(as_uuid=True), ForeignKey("members.id", ondelete="CASCADE"), nullable=False
    )
    encrypted_receiver_id: Mapped[str | None] = mapped_column(Text, nullable=True)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), nullable=False, default=utc_datetime_now
    )

    draw: Mapped["DrawModel"] = relationship("DrawModel", back_populates="assignments")
    giver_member: Mapped["MemberModel"] = relationship(
        "MemberModel", foreign_keys=[giver_member_id], back_populates="assignments_as_giver"
    )
    receiver_member: Mapped["MemberModel"] = relationship(
        "MemberModel", foreign_keys=[receiver_member_id], back_populates="assignments_as_receiver"
    )

    __table_args__ = (
        UniqueConstraint("draw_id", "giver_member_id", name="uq_draw_giver"),
        CheckConstraint("giver_member_id != receiver_member_id", name="ck_no_self_assignment"),
        Index("idx_assignments_draw_id", "draw_id"),
        Index("idx_assignments_giver_member_id", "giver_member_id"),
        Index("idx_assignments_receiver_member_id", "receiver_member_id"),
    )
