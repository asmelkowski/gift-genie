from dataclasses import dataclass


@dataclass(frozen=True, slots=True)
class ListAvailablePermissionsQuery:
    """Query to list all available permissions in the system.

    Attributes:
        requesting_user_id: Must be admin
        category: Optional filter by permission category (e.g., "draws", "groups")
    """

    requesting_user_id: str
    category: str | None = None
