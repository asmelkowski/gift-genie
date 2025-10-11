from dataclasses import dataclass


@dataclass
class ListMembersQuery:
    group_id: str
    requesting_user_id: str
    is_active: bool | None = None
    search: str | None = None
    page: int = 1
    page_size: int = 10
    sort: str = "name"