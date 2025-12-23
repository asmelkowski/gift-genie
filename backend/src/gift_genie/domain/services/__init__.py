"""Domain services for Gift Genie."""

from gift_genie.domain.services.permission_validator import (
    PermissionValidator,
    PermissionValidationResult,
)

__all__ = ["PermissionValidator", "PermissionValidationResult"]
