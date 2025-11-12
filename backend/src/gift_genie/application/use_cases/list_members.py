from __future__ import annotations

from dataclasses import dataclass

from gift_genie.application.dto.list_members_query import ListMembersQuery
from gift_genie.application.errors import ForbiddenError, GroupNotFoundError
from gift_genie.domain.entities.member import Member
from gift_genie.domain.interfaces.repositories import GroupRepository, MemberRepository


@dataclass(slots=True)
class ListMembersUseCase:
    group_repository: GroupRepository
    member_repository: MemberRepository

    async def execute(self, query: ListMembersQuery) -> tuple[list[Member], int]:
        # Validate group exists
        group = await self.group_repository.get_by_id(query.group_id)
        if not group:
            raise GroupNotFoundError()

        # Verify user is admin of the group
        if group.admin_user_id != query.requesting_user_id:
            raise ForbiddenError()

        # Validate pagination parameters
        if query.page < 1:
            raise ValueError("page must be >= 1")
        if not (1 <= query.page_size <= 100):
            raise ValueError("page_size must be 1-100")

        # Call repository
        return await self.member_repository.list_by_group(
            query.group_id,
            query.is_active,
            query.search,
            query.page,
            query.page_size,
            query.sort,
        )
