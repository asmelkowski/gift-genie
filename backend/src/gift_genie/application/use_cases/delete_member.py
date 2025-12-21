from __future__ import annotations

from dataclasses import dataclass

from gift_genie.application.dto.delete_member_command import DeleteMemberCommand
from gift_genie.application.errors import ForbiddenError, GroupNotFoundError, MemberNotFoundError
from gift_genie.domain.interfaces.repositories import GroupRepository, MemberRepository


@dataclass(slots=True)
class DeleteMemberUseCase:
    group_repository: GroupRepository
    member_repository: MemberRepository

    async def execute(self, command: DeleteMemberCommand) -> None:
        # Permission check removed (now at presentation layer via require_permission dependency)

        # Validate group exists
        group = await self.group_repository.get_by_id(command.group_id)
        if not group:
            raise GroupNotFoundError()

        # Verify user is owner of the group
        if group.admin_user_id != command.requesting_user_id:
            raise ForbiddenError()

        # Verify member exists and belongs to group
        member = await self.member_repository.get_by_group_and_id(
            command.group_id, command.member_id
        )
        if not member:
            raise MemberNotFoundError()

        # Delete the member (cascade handled by database)
        await self.member_repository.delete(command.member_id)
