from dataclasses import dataclass


@dataclass
class DeleteExclusionCommand:
    group_id: str
    exclusion_id: str
    requesting_user_id: str