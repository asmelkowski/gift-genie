from __future__ import annotations

from dataclasses import dataclass

from gift_genie.application.dto.update_member_command import UpdateMemberCommand
from gift_genie.application.errors import (
    CannotDeactivateMemberError,
    ForbiddenError,
    GroupNotFoundError,
    MemberEmailConflictError,
    MemberNameConflictError,
    MemberNotFoundError,
)
from gift_genie.domain.entities.member import Member
from gift_genie.domain.interfaces.repositories import GroupRepository, MemberRepository


@dataclass(slots=True)
class UpdateMemberUseCase:
    group_repository: GroupRepository
    member_repository: MemberRepository

    async def execute(self, command: UpdateMemberCommand) -> Member:
        # Validate group exists
        group = await self.group_repository.get_by_id(command.group_id)
        if not group:
            raise GroupNotFoundError()

        # Verify user is admin of the group
        if group.admin_user_id != command.requesting_user_id:
            raise ForbiddenError()

        # Retrieve existing member
        member = await self.member_repository.get_by_group_and_id(
            command.group_id, command.member_id
        )
        if not member:
            raise MemberNotFoundError()

        # Apply partial updates
        updated = False

        if command.name is not None:
            # Name already validated at presentation layer
            if command.name != member.name and await self.member_repository.name_exists_in_group(
                command.group_id, command.name, exclude_member_id=command.member_id
            ):
                raise MemberNameConflictError()
            member.name = command.name
            updated = True

        if command.email is not None:
            if command.email != member.email and await self.member_repository.email_exists_in_group(
                command.group_id, command.email, exclude_member_id=command.member_id
            ):
                raise MemberEmailConflictError()
            member.email = command.email
            updated = True

        if command.is_active is not None:
            if not command.is_active and member.is_active:  # Deactivating
                if await self.member_repository.has_pending_draw(command.member_id):
                    raise CannotDeactivateMemberError()
            member.is_active = command.is_active
            updated = True

        # Persist and return updated member
        if updated:
            return await self.member_repository.update(member)
        else:
            return member
