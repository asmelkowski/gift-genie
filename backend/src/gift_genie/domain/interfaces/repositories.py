from typing import Protocol, runtime_checkable
from gift_genie.domain.entities.group import Group
from gift_genie.domain.entities.member import Member
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


@runtime_checkable
class MemberRepository(Protocol):
    async def create(self, member: Member) -> Member: ...

    async def list_by_group(
        self,
        group_id: str,
        is_active: bool | None,
        search: str | None,
        page: int,
        page_size: int,
        sort: str
    ) -> tuple[list[Member], int]: ...

    async def get_by_id(self, member_id: str) -> Member | None: ...

    async def get_by_group_and_id(self, group_id: str, member_id: str) -> Member | None: ...

    async def name_exists_in_group(self, group_id: str, name: str, exclude_member_id: str | None = None) -> bool: ...

    async def email_exists_in_group(self, group_id: str, email: str, exclude_member_id: str | None = None) -> bool: ...

    async def has_pending_draw(self, member_id: str) -> bool: ...

    async def update(self, member: Member) -> Member: ...

    async def delete(self, member_id: str) -> None: ...
