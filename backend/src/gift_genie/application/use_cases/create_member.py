from __future__ import annotations

from dataclasses import dataclass
from uuid import uuid4

from gift_genie.application.dto.create_member_command import CreateMemberCommand
from gift_genie.application.errors import (
    ForbiddenError,
    GroupNotFoundError,
    InvalidMemberNameError,
    MemberEmailConflictError,
    MemberNameConflictError,
)
from gift_genie.domain.entities.member import Member
from gift_genie.domain.interfaces.repositories import GroupRepository, MemberRepository
from gift_genie.libs.utils import utc_datetime_now


@dataclass(slots=True)
class CreateMemberUseCase:
    group_repository: GroupRepository
    member_repository: MemberRepository

    async def execute(self, command: CreateMemberCommand) -> Member:
        # Validate group exists
        group = await self.group_repository.get_by_id(command.group_id)
        if not group:
            raise GroupNotFoundError()

        # Verify user is admin of the group
        if group.admin_user_id != command.requesting_user_id:
            raise ForbiddenError()

        # Validate name
        name = command.name.strip()
        if not (1 <= len(name) <= 100):
            raise InvalidMemberNameError()

        # Check name uniqueness
        if await self.member_repository.name_exists_in_group(command.group_id, name):
            raise MemberNameConflictError()

        # Check email uniqueness if provided
        if command.email and await self.member_repository.email_exists_in_group(command.group_id, command.email):
            raise MemberEmailConflictError()

        # Generate member ID and timestamp
        member_id = str(uuid4())
        now = utc_datetime_now()

        # Construct domain entity
        member = Member(
            id=member_id,
            group_id=command.group_id,
            name=name,
            email=command.email,
            is_active=command.is_active,
            created_at=now,
        )

        # Persist
        return await self.member_repository.create(member)