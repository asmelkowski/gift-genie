from __future__ import annotations

from dataclasses import dataclass

from gift_genie.application.dto.list_groups_query import ListGroupsQuery
from gift_genie.domain.entities.enums import UserRole
from gift_genie.domain.entities.group import Group
from gift_genie.domain.entities.user import User
from gift_genie.domain.interfaces.repositories import GroupRepository


@dataclass(slots=True)
class ListUserGroupsUseCase:
    group_repository: GroupRepository

    async def execute(self, query: ListGroupsQuery, user: User) -> tuple[list[Group], int]:
        # Validate pagination parameters
        if query.page < 1:
            raise ValueError("page must be >= 1")
        if not (1 <= query.page_size <= 100):
            raise ValueError("page_size must be 1-100")

        # Admin bypass: admins see ALL groups in system
        if user.role == UserRole.ADMIN:
            return await self.group_repository.list_all(
                query.search, query.page, query.page_size, query.sort
            )

        # Regular users: see only groups they have permission for
        return await self.group_repository.list_by_user_permissions(
            query.user_id, query.search, query.page, query.page_size, query.sort
        )
