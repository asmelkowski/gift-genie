from __future__ import annotations

from dataclasses import dataclass

from gift_genie.application.dto.get_member_query import GetMemberQuery
from gift_genie.application.errors import ForbiddenError, GroupNotFoundError, MemberNotFoundError
from gift_genie.domain.entities.member import Member
from gift_genie.domain.interfaces.repositories import GroupRepository, MemberRepository


@dataclass(slots=True)
class GetMemberUseCase:
    group_repository: GroupRepository
    member_repository: MemberRepository

    async def execute(self, query: GetMemberQuery) -> Member:
        # Validate group exists
        group = await self.group_repository.get_by_id(query.group_id)
        if not group:
            raise GroupNotFoundError()

        # Verify user is admin of the group
        if group.admin_user_id != query.requesting_user_id:
            raise ForbiddenError()

        # Retrieve member
        member = await self.member_repository.get_by_group_and_id(query.group_id, query.member_id)
        if not member:
            raise MemberNotFoundError()

        return member