from dataclasses import dataclass


@dataclass(slots=True)
class GetCurrentUserQuery:
    user_id: str