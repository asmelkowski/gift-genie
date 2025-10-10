from dataclasses import dataclass


@dataclass
class ListGroupsQuery:
    user_id: str
    search: str | None
    page: int
    page_size: int
    sort: str