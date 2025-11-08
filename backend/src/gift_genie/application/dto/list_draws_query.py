from dataclasses import dataclass

from gift_genie.domain.entities.enums import DrawStatus


@dataclass
class ListDrawsQuery:
    group_id: str
    requesting_user_id: str
    status: DrawStatus | None
    page: int
    page_size: int
    sort: str
