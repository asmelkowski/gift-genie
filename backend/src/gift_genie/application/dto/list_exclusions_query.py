from dataclasses import dataclass

from gift_genie.domain.entities.enums import ExclusionType


@dataclass
class ListExclusionsQuery:
    group_id: str
    requesting_user_id: str
    exclusion_type: ExclusionType | None
    giver_member_id: str | None
    receiver_member_id: str | None
    page: int
    page_size: int
    sort: str