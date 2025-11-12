from dataclasses import dataclass


@dataclass
class DeleteMemberCommand:
    group_id: str
    member_id: str
    requesting_user_id: str
