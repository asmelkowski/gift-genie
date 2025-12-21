from typing import Protocol, runtime_checkable
from gift_genie.domain.entities.assignment import Assignment
from gift_genie.domain.entities.draw import Draw
from gift_genie.domain.entities.enums import DrawStatus, ExclusionType
from gift_genie.domain.entities.exclusion import Exclusion
from gift_genie.domain.entities.group import Group
from gift_genie.domain.entities.member import Member
from gift_genie.domain.entities.permission import Permission
from gift_genie.domain.entities.user import User
from gift_genie.domain.entities.user_permission import UserPermission


@runtime_checkable
class UserRepository(Protocol):
    """Repository interface for User entities with case-insensitive email operations"""

    async def create(self, user: User) -> User: ...

    async def get_by_id(self, user_id: str) -> User | None: ...

    async def get_by_email_ci(self, email: str) -> User | None: ...

    async def email_exists_ci(self, email: str) -> bool: ...

    async def list_all(
        self, search: str | None, page: int, page_size: int, sort: str
    ) -> tuple[list[User], int]: ...


@runtime_checkable
class GroupRepository(Protocol):
    async def create(self, group: Group) -> Group: ...

    async def list_by_admin_user(
        self, user_id: str, search: str | None, page: int, page_size: int, sort: str
    ) -> tuple[list[Group], int]: ...

    async def list_all(
        self, search: str | None, page: int, page_size: int, sort: str
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
        sort: str,
    ) -> tuple[list[Member], int]: ...

    async def get_by_id(self, member_id: str) -> Member | None: ...

    async def get_many_by_ids(self, member_ids: list[str]) -> dict[str, Member]: ...

    async def get_by_group_and_id(self, group_id: str, member_id: str) -> Member | None: ...

    async def name_exists_in_group(
        self, group_id: str, name: str, exclude_member_id: str | None = None
    ) -> bool: ...

    async def email_exists_in_group(
        self, group_id: str, email: str, exclude_member_id: str | None = None
    ) -> bool: ...

    async def has_pending_draw(self, member_id: str) -> bool: ...

    async def update(self, member: Member) -> Member: ...

    async def delete(self, member_id: str) -> None: ...


@runtime_checkable
class ExclusionRepository(Protocol):
    async def list_by_group(
        self,
        group_id: str,
        exclusion_type: ExclusionType | None,
        giver_member_id: str | None,
        receiver_member_id: str | None,
        page: int,
        page_size: int,
        sort: str,
    ) -> tuple[list[Exclusion], int]: ...

    async def create(self, exclusion: Exclusion) -> Exclusion: ...

    async def create_many(self, exclusions: list[Exclusion]) -> list[Exclusion]: ...

    async def get_by_id(self, exclusion_id: str) -> Exclusion | None: ...

    async def get_by_group_and_id(self, group_id: str, exclusion_id: str) -> Exclusion | None: ...

    async def exists_for_pair(
        self, group_id: str, giver_member_id: str, receiver_member_id: str
    ) -> bool: ...

    async def check_conflicts_bulk(
        self, group_id: str, pairs: list[tuple[str, str]]
    ) -> list[dict]: ...

    async def delete(self, exclusion_id: str) -> None: ...


@runtime_checkable
class AssignmentRepository(Protocol):
    async def create_many(self, assignments: list[Assignment]) -> list[Assignment]: ...

    async def list_by_draw(self, draw_id: str) -> list[Assignment]: ...

    async def count_by_draw(self, draw_id: str) -> int: ...

    async def get_historical_exclusions(
        self, group_id: str, lookback_count: int
    ) -> list[tuple[str, str]]: ...


@runtime_checkable
class DrawRepository(Protocol):
    async def create(self, draw: Draw) -> Draw: ...

    async def list_by_group(
        self, group_id: str, status: DrawStatus | None, page: int, page_size: int, sort: str
    ) -> tuple[list[Draw], int]: ...

    async def get_by_id(self, draw_id: str) -> Draw | None: ...

    async def update(self, draw: Draw) -> Draw: ...

    async def delete(self, draw_id: str) -> None: ...


@runtime_checkable
class PermissionRepository(Protocol):
    """Repository interface for Permission entities."""

    async def get_by_code(self, code: str) -> Permission | None: ...

    async def list_all(self) -> list[Permission]: ...

    async def list_by_category(self, category: str) -> list[Permission]: ...

    async def create(self, permission: Permission) -> Permission: ...


@runtime_checkable
class UserPermissionRepository(Protocol):
    """Repository interface for UserPermission entities (many-to-many junction)."""

    async def grant_permission(
        self, user_id: str, permission_code: str, granted_by: str | None
    ) -> UserPermission: ...

    async def revoke_permission(self, user_id: str, permission_code: str) -> bool: ...

    async def has_permission(self, user_id: str, permission_code: str) -> bool: ...

    async def list_by_user(self, user_id: str) -> list[UserPermission]: ...

    async def list_permissions_for_user(self, user_id: str) -> list[Permission]: ...
