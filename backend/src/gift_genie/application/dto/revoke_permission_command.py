from dataclasses import dataclass


@dataclass(frozen=True, slots=True)
class RevokePermissionCommand:
    """Command to revoke a permission from a user.

    Attributes:
        requesting_user_id: The admin performing the action
        target_user_id: The user losing the permission
        permission_code: The permission code to revoke (e.g., "draws:notify")
    """

    requesting_user_id: str
    target_user_id: str
    permission_code: str
