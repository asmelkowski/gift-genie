from dataclasses import dataclass


@dataclass
class GetMemberQuery:
    group_id: str
    member_id: str
    requesting_user_id: str