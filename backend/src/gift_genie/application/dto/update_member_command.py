from dataclasses import dataclass


@dataclass
class UpdateMemberCommand:
    group_id: str
    member_id: str
    requesting_user_id: str
    name: str | None = None
    email: str | None = None
    is_active: bool | None = None
