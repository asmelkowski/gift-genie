from dataclasses import dataclass


@dataclass
class ExclusionItem:
    giver_member_id: str
    receiver_member_id: str
    is_mutual: bool


@dataclass
class CreateExclusionsBulkCommand:
    group_id: str
    requesting_user_id: str
    items: list[ExclusionItem]