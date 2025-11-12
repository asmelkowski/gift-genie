from dataclasses import dataclass


@dataclass
class NotifyDrawCommand:
    draw_id: str
    requesting_user_id: str
    resend: bool = False
