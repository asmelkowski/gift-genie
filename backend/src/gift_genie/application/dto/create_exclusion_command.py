from dataclasses import dataclass


@dataclass
class CreateExclusionCommand:
    group_id: str
    requesting_user_id: str
    giver_member_id: str
    receiver_member_id: str
    is_mutual: bool
