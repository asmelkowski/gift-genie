from dataclasses import dataclass


@dataclass
class DeleteGroupCommand:
    group_id: str
    requesting_user_id: str