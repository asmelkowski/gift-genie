class EmailConflictError(Exception):
    """Raised when attempting to register a user with a duplicate email (case-insensitive)."""

    def __init__(self, message: str = "Email already in use"):
        super().__init__(message)
