from datetime import datetime
from uuid import UUID, uuid4

from sqlalchemy import Boolean, DateTime, ForeignKey, Index
from sqlalchemy.orm import Mapped, mapped_column, relationship
from sqlalchemy.dialects.postgresql import ENUM, UUID as PostgresUUID

from gift_genie.domain.entities import ExclusionType
from gift_genie.infrastructure.database.models.base import Base
from gift_genie.libs.utils import utc_datetime_now


class ExclusionModel(Base):
    __tablename__ = "exclusions"

    id: Mapped[UUID] = mapped_column(PostgresUUID(as_uuid=True), primary_key=True, default=uuid4)
    group_id: Mapped[UUID] = mapped_column(
        PostgresUUID(as_uuid=True), ForeignKey("groups.id", ondelete="CASCADE"), nullable=False
    )
    giver_member_id: Mapped[UUID] = mapped_column(
        PostgresUUID(as_uuid=True), ForeignKey("members.id", ondelete="CASCADE"), nullable=False
    )
    receiver_member_id: Mapped[UUID] = mapped_column(
        PostgresUUID(as_uuid=True), ForeignKey("members.id", ondelete="CASCADE"), nullable=False
    )
    exclusion_type: Mapped[ExclusionType] = mapped_column(
        ENUM(ExclusionType, name="exclusion_type_enum"), nullable=False
    )
    is_mutual: Mapped[bool] = mapped_column(Boolean, nullable=False, default=False)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False, default=utc_datetime_now)
    created_by_user_id: Mapped[UUID | None] = mapped_column(
        PostgresUUID(as_uuid=True), ForeignKey("users.id", ondelete="SET NULL"), nullable=True
    )

    group: Mapped["GroupModel"] = relationship("GroupModel", back_populates="exclusions")
    giver_member: Mapped["MemberModel"] = relationship(
        "MemberModel", foreign_keys=[giver_member_id], back_populates="exclusions_as_giver"
    )
    receiver_member: Mapped["MemberModel"] = relationship(
        "MemberModel", foreign_keys=[receiver_member_id], back_populates="exclusions_as_receiver"
    )
    created_by_user: Mapped["UserModel"] = relationship(
        "UserModel", back_populates="created_exclusions"
    )

    __table_args__ = (
        Index("idx_exclusions_group_id", "group_id"),
        Index("idx_exclusions_giver_member_id", "giver_member_id"),
        Index("idx_exclusions_receiver_member_id", "receiver_member_id"),
        Index("idx_exclusions_created_by_user_id", "created_by_user_id"),
    )
