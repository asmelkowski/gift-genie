from dataclasses import dataclass


@dataclass
class GetDrawQuery:
    draw_id: str
    requesting_user_id: str