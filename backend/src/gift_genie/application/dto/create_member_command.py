from dataclasses import dataclass


@dataclass
class CreateMemberCommand:
    group_id: str
    requesting_user_id: str
    name: str
    email: str | None = None
    is_active: bool = True