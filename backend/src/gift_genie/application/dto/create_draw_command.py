from dataclasses import dataclass


@dataclass
class CreateDrawCommand:
    group_id: str
    requesting_user_id: str
    seed: str | None = None