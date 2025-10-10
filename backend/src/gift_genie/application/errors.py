class EmailConflictError(Exception):
    """Raised when attempting to register a user with a duplicate email (case-insensitive)."""

    def __init__(self, message: str = "Email already in use"):
        super().__init__(message)


class InvalidCredentialsError(Exception):
    """Raised when login credentials are invalid."""

    def __init__(self, message: str = "Invalid credentials"):
        super().__init__(message)

class InvalidGroupNameError(Exception):
    """Raised when group name validation fails."""

    def __init__(self, message: str = "Group name must be 1-100 characters"):
        super().__init__(message)


class GroupNotFoundError(Exception):
    """Raised when a group is not found."""
    pass


class ForbiddenError(Exception):
    """Raised when user lacks permission for an operation."""
    pass
