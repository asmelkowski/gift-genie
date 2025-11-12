from dataclasses import dataclass


@dataclass
class GetGroupDetailsQuery:
    group_id: str
    requesting_user_id: str
