from dataclasses import dataclass


@dataclass(frozen=True, slots=True)
class GrantPermissionCommand:
    """Command to grant a permission to a user.

    Attributes:
        requesting_user_id: The admin performing the action
        target_user_id: The user receiving the permission
        permission_code: The permission code to grant (e.g., "draws:notify")
    """

    requesting_user_id: str
    target_user_id: str
    permission_code: str
