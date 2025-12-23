from __future__ import annotations

from datetime import datetime
from typing import Annotated

from fastapi import APIRouter, Depends, HTTPException, Path, Query, Response
from pydantic import BaseModel, ConfigDict, Field, StringConstraints

from gift_genie.application.dto.grant_permission_command import GrantPermissionCommand
from gift_genie.application.dto.revoke_permission_command import RevokePermissionCommand
from gift_genie.application.dto.list_user_permissions_query import ListUserPermissionsQuery
from gift_genie.application.dto.list_available_permissions_query import (
    ListAvailablePermissionsQuery,
)
from gift_genie.application.errors import ForbiddenError, NotFoundError
from gift_genie.application.use_cases.grant_permission import GrantPermissionUseCase
from gift_genie.application.use_cases.revoke_permission import RevokePermissionUseCase
from gift_genie.application.use_cases.list_user_permissions import ListUserPermissionsUseCase
from gift_genie.application.use_cases.list_available_permissions import (
    ListAvailablePermissionsUseCase,
)
from gift_genie.domain.interfaces.repositories import (
    UserRepository,
    GroupRepository,
    PermissionRepository,
    UserPermissionRepository,
)
from gift_genie.domain.services.permission_validator import PermissionValidator
from gift_genie.presentation.api.dependencies import (
    get_current_admin_user,
    get_user_repository,
    get_group_repository,
    get_user_permission_repository,
    get_permission_repository,
    get_permission_validator,
)
from gift_genie.presentation.api.v1.shared import PaginationMeta

router = APIRouter(prefix="/admin", tags=["admin"])


# =====================
# Pydantic Models
# =====================


class UserResponse(BaseModel):
    id: str
    email: str
    name: str
    role: str
    created_at: datetime
    updated_at: datetime


class PaginatedUsersResponse(BaseModel):
    data: list[UserResponse]
    meta: PaginationMeta


class GroupResponse(BaseModel):
    id: str
    name: str
    admin_user_id: str
    created_at: datetime
    updated_at: datetime
    historical_exclusions_enabled: bool


class PaginatedGroupsResponse(BaseModel):
    data: list[GroupResponse]
    meta: PaginationMeta


# Permission-related models
class GrantPermissionRequest(BaseModel):
    """Request body for granting a permission to a user."""

    model_config = ConfigDict(extra="forbid")

    permission_code: Annotated[str, StringConstraints(min_length=1, max_length=100)]
    notes: str | None = Field(default=None, max_length=500)


class PermissionResponse(BaseModel):
    """Response model for a permission."""

    code: str
    name: str
    description: str
    category: str
    created_at: datetime


class UserPermissionResponse(BaseModel):
    """Response model for a user's permission grant."""

    user_id: str
    permission_code: str
    granted_at: datetime
    granted_by: str | None


# =====================
# Permission Endpoints
# =====================


@router.post(
    "/users/{user_id}/permissions",
    response_model=UserPermissionResponse,
)
async def grant_permission(
    user_id: Annotated[str, Path(..., description="The user ID to grant permission to")],
    request: GrantPermissionRequest,
    response: Response,
    *,
    admin_id: Annotated[str, Depends(get_current_admin_user)],
    user_repo: Annotated[UserRepository, Depends(get_user_repository)],
    permission_validator: Annotated[PermissionValidator, Depends(get_permission_validator)],
    user_permission_repo: Annotated[
        UserPermissionRepository, Depends(get_user_permission_repository)
    ],
) -> UserPermissionResponse:
    """Grant a permission to a user (idempotent).

    Only administrators can grant permissions. This endpoint is idempotent:
    granting a permission that already exists will return the existing grant
    with HTTP 200 instead of 201.

    Args:
        user_id: The user ID to grant permission to
        request: The permission to grant (permission_code, optional notes)
        admin_id: The current admin user ID (from auth)
        response: FastAPI Response object to set status code

    Returns:
        201 Created if the permission was newly granted
        200 OK if the permission was already granted (idempotent)

    Raises:
        403: If the current user is not an admin
        404: If the user or permission doesn't exist
    """
    try:
        # Check if permission already exists
        already_granted = await user_permission_repo.has_permission(
            user_id=user_id,
            permission_code=request.permission_code,
        )

        command = GrantPermissionCommand(
            requesting_user_id=admin_id,
            target_user_id=user_id,
            permission_code=request.permission_code,
        )

        use_case = GrantPermissionUseCase(
            user_repository=user_repo,
            user_permission_repository=user_permission_repo,
            permission_validator=permission_validator,
        )

        user_permission = await use_case.execute(command)

        # Set appropriate status code: 201 if new, 200 if already existed
        response.status_code = 200 if already_granted else 201

        return UserPermissionResponse(
            user_id=user_permission.user_id,
            permission_code=user_permission.permission_code,
            granted_at=user_permission.granted_at,
            granted_by=user_permission.granted_by,
        )

    except NotFoundError as e:
        raise HTTPException(status_code=404, detail={"code": "not_found", "message": str(e)})
    except ForbiddenError as e:
        raise HTTPException(status_code=403, detail={"code": "forbidden", "message": str(e)})


@router.delete(
    "/users/{user_id}/permissions/{permission_code}",
    status_code=204,
)
async def revoke_permission(
    user_id: Annotated[str, Path(..., description="The user ID to revoke permission from")],
    permission_code: Annotated[str, Path(..., description="The permission code to revoke")],
    *,
    admin_id: Annotated[str, Depends(get_current_admin_user)],
    user_repo: Annotated[UserRepository, Depends(get_user_repository)],
    user_permission_repo: Annotated[
        UserPermissionRepository, Depends(get_user_permission_repository)
    ],
) -> Response:
    """Revoke a permission from a user.

    Only administrators can revoke permissions. This is idempotent - revoking
    a non-existent permission returns 204.

    Args:
        user_id: The user ID to revoke permission from
        permission_code: The permission code to revoke
        admin_id: The current admin user ID (from auth)

    Returns:
        204 No Content

    Raises:
        403: If the current user is not an admin
        404: If the user doesn't exist
    """
    try:
        command = RevokePermissionCommand(
            requesting_user_id=admin_id,
            target_user_id=user_id,
            permission_code=permission_code,
        )

        use_case = RevokePermissionUseCase(
            user_repository=user_repo,
            user_permission_repository=user_permission_repo,
        )

        await use_case.execute(command)

        return Response(status_code=204)

    except NotFoundError as e:
        raise HTTPException(status_code=404, detail={"code": "not_found", "message": str(e)})
    except ForbiddenError as e:
        raise HTTPException(status_code=403, detail={"code": "forbidden", "message": str(e)})


@router.get(
    "/users/{user_id}/permissions",
    response_model=list[PermissionResponse],
)
async def list_user_permissions(
    user_id: Annotated[str, Path(..., description="The user ID to list permissions for")],
    *,
    admin_id: Annotated[str, Depends(get_current_admin_user)],
    user_repo: Annotated[UserRepository, Depends(get_user_repository)],
    user_permission_repo: Annotated[
        UserPermissionRepository, Depends(get_user_permission_repository)
    ],
) -> list[PermissionResponse]:
    """List all permissions for a specific user.

    Only administrators can list user permissions.

    Args:
        user_id: The user ID to list permissions for
        admin_id: The current admin user ID (from auth)

    Returns:
        200 OK with list of permissions

    Raises:
        403: If the current user is not an admin
        404: If the user doesn't exist
    """
    try:
        query = ListUserPermissionsQuery(
            requesting_user_id=admin_id,
            target_user_id=user_id,
        )

        use_case = ListUserPermissionsUseCase(
            user_repository=user_repo,
            user_permission_repository=user_permission_repo,
        )

        permissions = await use_case.execute(query)

        return [
            PermissionResponse(
                code=p.code,
                name=p.name,
                description=p.description,
                category=p.category,
                created_at=p.created_at,
            )
            for p in permissions
        ]

    except NotFoundError as e:
        raise HTTPException(status_code=404, detail={"code": "not_found", "message": str(e)})
    except ForbiddenError as e:
        raise HTTPException(status_code=403, detail={"code": "forbidden", "message": str(e)})


@router.get(
    "/permissions",
    response_model=list[PermissionResponse],
)
async def list_available_permissions(
    category: str | None = Query(None, description="Optional filter by permission category"),
    *,
    admin_id: Annotated[str, Depends(get_current_admin_user)],
    user_repo: Annotated[UserRepository, Depends(get_user_repository)],
    permission_repo: Annotated[PermissionRepository, Depends(get_permission_repository)],
) -> list[PermissionResponse]:
    """List all available permissions in the system.

    Only administrators can list available permissions.

    Args:
        category: Optional filter by permission category (e.g., "draws", "groups")
        admin_id: The current admin user ID (from auth)

    Returns:
        200 OK with list of available permissions

    Raises:
        403: If the current user is not an admin
    """
    try:
        query = ListAvailablePermissionsQuery(
            requesting_user_id=admin_id,
            category=category,
        )

        use_case = ListAvailablePermissionsUseCase(
            user_repository=user_repo,
            permission_repository=permission_repo,
        )

        permissions = await use_case.execute(query)

        return [
            PermissionResponse(
                code=p.code,
                name=p.name,
                description=p.description,
                category=p.category,
                created_at=p.created_at,
            )
            for p in permissions
        ]

    except ForbiddenError as e:
        raise HTTPException(status_code=403, detail={"code": "forbidden", "message": str(e)})


# =====================
# User Management Endpoints
# =====================


@router.get("/users", response_model=PaginatedUsersResponse)
async def list_users(
    search: str | None = Query(None),
    page: int = Query(1, ge=1),
    page_size: int = Query(10, ge=1, le=100),
    sort: str = Query("newest"),
    *,
    admin_id: Annotated[str, Depends(get_current_admin_user)],
    user_repo: Annotated[UserRepository, Depends(get_user_repository)],
) -> PaginatedUsersResponse:
    users, total = await user_repo.list_all(search, page, page_size, sort)

    data = [
        UserResponse(
            id=u.id,
            email=u.email,
            name=u.name,
            role=u.role,
            created_at=u.created_at,
            updated_at=u.updated_at,
        )
        for u in users
    ]

    total_pages = (total + page_size - 1) // page_size
    meta = PaginationMeta(total=total, page=page, page_size=page_size, total_pages=total_pages)
    return PaginatedUsersResponse(data=data, meta=meta)


@router.get("/groups", response_model=PaginatedGroupsResponse)
async def list_groups(
    search: str | None = Query(None),
    page: int = Query(1, ge=1),
    page_size: int = Query(10, ge=1, le=100),
    sort: str = Query("-created_at"),
    *,
    admin_id: Annotated[str, Depends(get_current_admin_user)],
    group_repo: Annotated[GroupRepository, Depends(get_group_repository)],
) -> PaginatedGroupsResponse:
    groups, total = await group_repo.list_all(search, page, page_size, sort)

    data = [
        GroupResponse(
            id=g.id,
            name=g.name,
            admin_user_id=g.admin_user_id,
            created_at=g.created_at,
            updated_at=g.updated_at,
            historical_exclusions_enabled=g.historical_exclusions_enabled,
        )
        for g in groups
    ]

    total_pages = (total + page_size - 1) // page_size
    meta = PaginationMeta(total=total, page=page, page_size=page_size, total_pages=total_pages)
    return PaginatedGroupsResponse(data=data, meta=meta)
