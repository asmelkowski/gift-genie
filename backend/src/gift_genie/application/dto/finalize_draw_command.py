from dataclasses import dataclass


@dataclass
class FinalizeDrawCommand:
    draw_id: str
    requesting_user_id: str