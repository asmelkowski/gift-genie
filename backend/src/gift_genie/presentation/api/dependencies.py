from collections.abc import AsyncGenerator
from typing import Annotated

from fastapi import Depends, HTTPException, Request
from sqlalchemy.ext.asyncio import AsyncSession

from gift_genie.application.dto.get_current_user_query import GetCurrentUserQuery
from gift_genie.application.errors import ForbiddenError
from gift_genie.application.services.authorization_service import AuthorizationServiceImpl
from gift_genie.application.use_cases.get_current_user import GetCurrentUserUseCase
from gift_genie.domain.entities.enums import UserRole
from gift_genie.domain.interfaces.authorization_service import AuthorizationService
from gift_genie.domain.interfaces.repositories import (
    GroupRepository,
    UserPermissionRepository,
    UserRepository,
)
from gift_genie.infrastructure.config.settings import get_settings
from gift_genie.infrastructure.database.repositories.groups import GroupRepositorySqlAlchemy
from gift_genie.infrastructure.database.repositories.user_permissions import (
    UserPermissionRepositorySqlAlchemy,
)
from gift_genie.infrastructure.database.repositories.users import UserRepositorySqlAlchemy
from gift_genie.infrastructure.database.session import get_async_session
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


async def get_user_repository(
    session: Annotated[AsyncSession, Depends(get_async_session)],
) -> AsyncGenerator[UserRepository, None]:
    yield UserRepositorySqlAlchemy(session)


async def get_group_repository(
    session: Annotated[AsyncSession, Depends(get_async_session)],
) -> AsyncGenerator[GroupRepository, None]:
    yield GroupRepositorySqlAlchemy(session)


async def get_user_permission_repository(
    session: Annotated[AsyncSession, Depends(get_async_session)],
) -> AsyncGenerator[UserPermissionRepository, None]:
    """Dependency to provide UserPermissionRepository for permission checks."""
    yield UserPermissionRepositorySqlAlchemy(session)


async def get_authorization_service(
    user_repo: Annotated[UserRepository, Depends(get_user_repository)],
    user_permission_repo: Annotated[
        UserPermissionRepository, Depends(get_user_permission_repository)
    ],
) -> AsyncGenerator[AuthorizationService, None]:
    """Dependency to provide AuthorizationService for permission checks."""
    yield AuthorizationServiceImpl(user_repo, user_permission_repo)


def require_permission(permission_code: str):
    """FastAPI dependency that checks if the current user has a specific permission.

    Usage in endpoints:
        @router.post("/some-action")
        async def some_action(
            current_user_id: Annotated[str, Depends(require_permission("draws:notify"))],
        ):
            # Only users with draws:notify permission can reach here

    Args:
        permission_code: The permission code to check (e.g., "draws:notify")

    Returns:
        A dependency function that returns the user_id if permission is granted

    Raises:
        HTTPException with 403 status if permission is denied
    """

    async def _check_permission(
        current_user_id: Annotated[str, Depends(get_current_user)],
        user_repo: Annotated[UserRepository, Depends(get_user_repository)],
        user_permission_repo: Annotated[
            UserPermissionRepository, Depends(get_user_permission_repository)
        ],
    ) -> str:
        auth_service: AuthorizationService = AuthorizationServiceImpl(
            user_repo, user_permission_repo
        )
        try:
            await auth_service.require_permission(current_user_id, permission_code)
            return current_user_id
        except ForbiddenError:
            raise HTTPException(
                status_code=403,
                detail={"code": "forbidden", "message": f"Permission '{permission_code}' required"},
            )

    return _check_permission


async def get_current_admin_user(
    current_user_id: Annotated[str, Depends(get_current_user)],
    user_repo: Annotated[UserRepository, Depends(get_user_repository)],
) -> str:
    query = GetCurrentUserQuery(user_id=current_user_id)
    use_case = GetCurrentUserUseCase(user_repository=user_repo)
    try:
        user = await use_case.execute(query)
        if user.role != UserRole.ADMIN:
            raise HTTPException(
                status_code=403, detail={"code": "forbidden", "message": "Admin access required"}
            )
        return user.id
    except Exception:
        # If user not found or any other error
        raise HTTPException(status_code=401, detail={"code": "unauthorized"})


# Type alias for dependency injection
CurrentUser = Annotated[str, Depends(get_current_user)]
CurrentAdminUser = Annotated[str, Depends(get_current_admin_user)]
