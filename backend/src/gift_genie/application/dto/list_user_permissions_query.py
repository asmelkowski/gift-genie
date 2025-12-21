from dataclasses import dataclass


@dataclass(frozen=True, slots=True)
class ListUserPermissionsQuery:
    """Query to list all permissions for a specific user.

    Attributes:
        requesting_user_id: Must be admin
        target_user_id: User whose permissions to list
    """

    requesting_user_id: str
    target_user_id: str
