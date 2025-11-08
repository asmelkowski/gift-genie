from dataclasses import dataclass


@dataclass
class DeleteDrawCommand:
    draw_id: str
    requesting_user_id: str
