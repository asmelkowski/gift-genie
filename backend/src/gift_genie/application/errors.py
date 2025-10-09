class EmailConflictError(Exception):
    """Raised when attempting to register a user with a duplicate email (case-insensitive)."""

    def __init__(self, message: str = "Email already in use"):
        super().__init__(message)


class InvalidCredentialsError(Exception):
    """Raised when login credentials are invalid."""

    def __init__(self, message: str = "Invalid credentials"):
        super().__init__(message)
