from dataclasses import dataclass


@dataclass
class CreateGroupCommand:
    admin_user_id: str
    name: str
    historical_exclusions_enabled: bool
    historical_exclusions_lookback: int