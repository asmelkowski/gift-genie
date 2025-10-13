from dataclasses import dataclass


@dataclass
class ExecuteDrawCommand:
    draw_id: str
    requesting_user_id: str
    seed: str | None = None