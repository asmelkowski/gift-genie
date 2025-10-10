from typing import Protocol, runtime_checkable
from gift_genie.domain.entities.group import Group
from gift_genie.domain.entities.user import User


@runtime_checkable
class UserRepository(Protocol):
    """Repository interface for User entities with case-insensitive email operations"""

    async def create(self, user: User) -> User: ...

    async def get_by_email_ci(self, email: str) -> User | None: ...

    async def email_exists_ci(self, email: str) -> bool: ...


@runtime_checkable
class GroupRepository(Protocol):
    async def create(self, group: Group) -> Group: ...

    async def list_by_admin_user(
        self,
        user_id: str,
        search: str | None,
        page: int,
        page_size: int,
        sort: str
    ) -> tuple[list[Group], int]: ...

    async def get_by_id(self, group_id: str) -> Group | None: ...

    async def get_member_stats(self, group_id: str) -> tuple[int, int]: ...

    async def update(self, group: Group) -> Group: ...

    async def delete(self, group_id: str) -> None: ...
