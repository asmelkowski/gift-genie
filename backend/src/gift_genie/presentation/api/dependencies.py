"""Shared dependencies for API endpoints"""

from __future__ import annotations

from typing import Annotated

from fastapi import Depends, HTTPException, Request

from gift_genie.infrastructure.config.settings import get_settings
from gift_genie.infrastructure.security.jwt import JWTService


async def get_current_user(request: Request) -> str:
    """Extract and validate user from JWT token in Authorization header or cookie.

    Checks Authorization header first (for API requests/tests), then falls back
    to cookie-based auth (for browser navigation). This allows both authentication
    methods to work seamlessly.

    Args:
        request: The incoming HTTP request

    Returns:
        The user ID from the validated token

    Raises:
        HTTPException: If token is missing or invalid (401)
    """
    token = None

    # First try to get token from Authorization header (for API requests in tests)
    auth_header = request.headers.get("Authorization")
    if auth_header and auth_header.startswith("Bearer "):
        token = auth_header.split(" ")[1]
    else:
        # Fall back to cookie-based auth (for browser navigation)
        token = request.cookies.get("access_token")

    if not token:
        raise HTTPException(status_code=401, detail={"code": "unauthorized"})

    settings = get_settings()
    jwt_service = JWTService(settings.SECRET_KEY, settings.ALGORITHM)
    try:
        payload = jwt_service.verify_token(token)
        user_id = payload.get("sub")
        if not user_id or not isinstance(user_id, str):
            raise HTTPException(status_code=401, detail={"code": "unauthorized"})
        return str(user_id)
    except ValueError:
        raise HTTPException(status_code=401, detail={"code": "unauthorized"})


# Type alias for dependency injection
CurrentUser = Annotated[str, Depends(get_current_user)]
