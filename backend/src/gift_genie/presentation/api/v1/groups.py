from __future__ import annotations

from collections.abc import AsyncGenerator
from datetime import datetime
from typing import Annotated
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, Path, Query, Response
from loguru import logger
from pydantic import BaseModel, ConfigDict, Field, StringConstraints
from sqlalchemy.ext.asyncio import AsyncSession

from gift_genie.application.dto.create_group_command import CreateGroupCommand
from gift_genie.application.dto.list_groups_query import ListGroupsQuery
from gift_genie.application.errors import InvalidGroupNameError
from gift_genie.application.use_cases.create_group import CreateGroupUseCase
from gift_genie.application.use_cases.list_user_groups import ListUserGroupsUseCase
from gift_genie.presentation.api.v1.shared import PaginationMeta
from pydantic import model_validator

from gift_genie.application.dto.delete_group_command import DeleteGroupCommand
from gift_genie.application.dto.get_group_details_query import GetGroupDetailsQuery
from gift_genie.application.dto.update_group_command import UpdateGroupCommand
from gift_genie.application.errors import ForbiddenError, GroupNotFoundError
from gift_genie.application.use_cases.delete_group import DeleteGroupUseCase
from gift_genie.application.use_cases.get_group_details import GetGroupDetailsUseCase
from gift_genie.application.use_cases.update_group import UpdateGroupUseCase
from gift_genie.domain.interfaces.repositories import GroupRepository
from gift_genie.infrastructure.database.repositories.groups import GroupRepositorySqlAlchemy
from gift_genie.infrastructure.database.session import get_async_session
from gift_genie.presentation.api.dependencies import get_current_user

router = APIRouter(prefix="/groups", tags=["groups"])


# Pydantic Models
class CreateGroupRequest(BaseModel):
    model_config = ConfigDict(extra="forbid")
    name: Annotated[str, StringConstraints(min_length=1, max_length=100, strip_whitespace=True)]
    historical_exclusions_enabled: bool | None = None
    historical_exclusions_lookback: int | None = Field(default=None, ge=1)


class GroupSummary(BaseModel):
    id: str
    name: str
    created_at: datetime
    historical_exclusions_enabled: bool
    historical_exclusions_lookback: int


class PaginatedGroupsResponse(BaseModel):
    data: list[GroupSummary]
    meta: PaginationMeta


class GroupDetailResponse(BaseModel):
    id: str
    name: str
    admin_user_id: str
    historical_exclusions_enabled: bool
    historical_exclusions_lookback: int
    created_at: datetime
    updated_at: datetime


class UpdateGroupRequest(BaseModel):
    model_config = ConfigDict(extra="forbid")
    name: (
        Annotated[str, StringConstraints(min_length=1, max_length=100, strip_whitespace=True)]
        | None
    ) = None
    historical_exclusions_enabled: bool | None = None
    historical_exclusions_lookback: int | None = Field(default=None, ge=1)

    @model_validator(mode="after")
    def check_at_least_one_field(self) -> "UpdateGroupRequest":
        if all(
            v is None
            for v in [
                self.name,
                self.historical_exclusions_enabled,
                self.historical_exclusions_lookback,
            ]
        ):
            raise ValueError("At least one field must be provided")
        return self


class GroupStats(BaseModel):
    member_count: int
    active_member_count: int


class GroupDetailWithStatsResponse(BaseModel):
    id: str
    name: str
    admin_user_id: str
    historical_exclusions_enabled: bool
    historical_exclusions_lookback: int
    created_at: datetime
    updated_at: datetime
    stats: GroupStats


class GroupUpdateResponse(BaseModel):
    id: str
    name: str
    historical_exclusions_enabled: bool
    historical_exclusions_lookback: int
    updated_at: datetime


# Dependencies
async def get_group_repository(
    session: Annotated[AsyncSession, Depends(get_async_session)],
) -> AsyncGenerator[GroupRepository, None]:
    yield GroupRepositorySqlAlchemy(session)


@router.get("", response_model=PaginatedGroupsResponse)
async def list_groups(
    search: str | None = Query(None),
    page: int = Query(1, ge=1),
    page_size: int = Query(10, ge=1, le=100),
    sort: str = Query("-created_at", pattern=r"^-?(created_at|name)$"),
    *,
    current_user_id: Annotated[str, Depends(get_current_user)],
    group_repo: Annotated[GroupRepository, Depends(get_group_repository)],
) -> PaginatedGroupsResponse:
    try:
        query = ListGroupsQuery(
            user_id=current_user_id,
            search=search,
            page=page,
            page_size=page_size,
            sort=sort,
        )
        use_case = ListUserGroupsUseCase(group_repository=group_repo)
        groups, total = await use_case.execute(query)

        data = [
            GroupSummary(
                id=g.id,
                name=g.name,
                created_at=g.created_at,
                historical_exclusions_enabled=g.historical_exclusions_enabled,
                historical_exclusions_lookback=g.historical_exclusions_lookback,
            )
            for g in groups
        ]
        total_pages = (total + page_size - 1) // page_size
        meta = PaginationMeta(total=total, page=page, page_size=page_size, total_pages=total_pages)
        return PaginatedGroupsResponse(data=data, meta=meta)
    except ValueError as e:
        logger.warning(
            "Invalid query parameters in list groups", user_id=current_user_id, error=str(e)
        )
        raise HTTPException(
            status_code=400, detail={"code": "invalid_query_params", "errors": [str(e)]}
        )
    except Exception as e:
        logger.exception(
            "Unexpected error during list groups", user_id=current_user_id, error=str(e)
        )
        raise HTTPException(status_code=500, detail={"code": "server_error"})


@router.post("", response_model=GroupDetailResponse, status_code=201)
async def create_group(
    payload: CreateGroupRequest,
    response: Response,
    *,
    current_user_id: Annotated[str, Depends(get_current_user)],
    group_repo: Annotated[GroupRepository, Depends(get_group_repository)],
) -> GroupDetailResponse:
    try:
        # Apply defaults
        enabled = (
            payload.historical_exclusions_enabled
            if payload.historical_exclusions_enabled is not None
            else True
        )
        lookback = (
            payload.historical_exclusions_lookback
            if payload.historical_exclusions_lookback is not None
            else 1
        )

        command = CreateGroupCommand(
            admin_user_id=current_user_id,
            name=payload.name,
            historical_exclusions_enabled=enabled,
            historical_exclusions_lookback=lookback,
        )
        use_case = CreateGroupUseCase(group_repository=group_repo)
        group = await use_case.execute(command)

        resp = GroupDetailResponse(
            id=group.id,
            name=group.name,
            admin_user_id=group.admin_user_id,
            historical_exclusions_enabled=group.historical_exclusions_enabled,
            historical_exclusions_lookback=group.historical_exclusions_lookback,
            created_at=group.created_at,
            updated_at=group.updated_at,
        )
        response.headers["Location"] = f"/api/v1/groups/{group.id}"
        return resp
    except InvalidGroupNameError as e:
        logger.warning(
            "Invalid group name during creation",
            user_id=current_user_id,
            name=payload.name,
            error=str(e),
        )
        raise HTTPException(
            status_code=400,
            detail={
                "code": "invalid_payload",
                "field": "name",
                "message": "Group name must be 1-100 characters",
            },
        )
    except ValueError as e:
        logger.warning(
            "Validation error during group creation",
            user_id=current_user_id,
            name=payload.name,
            error=str(e),
        )
        if "historical_exclusions_lookback" in str(e):
            raise HTTPException(
                status_code=400,
                detail={
                    "code": "invalid_payload",
                    "field": "historical_exclusions_lookback",
                    "message": str(e),
                },
            )
        raise HTTPException(
            status_code=400,
            detail={"code": "invalid_payload", "field": "name", "message": str(e)},
        )
    except Exception as e:
        logger.exception(
            "Unexpected error during group creation",
            user_id=current_user_id,
            name=payload.name,
            error=str(e),
        )
        raise HTTPException(status_code=500, detail={"code": "server_error"})


@router.get("/{group_id}", response_model=GroupDetailWithStatsResponse)
async def get_group_details(
    group_id: UUID = Path(..., description="Group UUID"),
    *,
    current_user_id: Annotated[str, Depends(get_current_user)],
    group_repo: Annotated[GroupRepository, Depends(get_group_repository)],
) -> GroupDetailWithStatsResponse:
    try:
        query = GetGroupDetailsQuery(group_id=str(group_id), requesting_user_id=current_user_id)
        use_case = GetGroupDetailsUseCase(group_repository=group_repo)
        group, (member_count, active_count) = await use_case.execute(query)

        return GroupDetailWithStatsResponse(
            id=group.id,
            name=group.name,
            admin_user_id=group.admin_user_id,
            historical_exclusions_enabled=group.historical_exclusions_enabled,
            historical_exclusions_lookback=group.historical_exclusions_lookback,
            created_at=group.created_at,
            updated_at=group.updated_at,
            stats=GroupStats(member_count=member_count, active_member_count=active_count),
        )
    except GroupNotFoundError as e:
        logger.warning(
            "Group not found during details retrieval",
            user_id=current_user_id,
            group_id=group_id,
            error=str(e),
        )
        raise HTTPException(status_code=404, detail={"code": "group_not_found"})
    except ForbiddenError as e:
        logger.warning(
            "Forbidden access to group details",
            user_id=current_user_id,
            group_id=group_id,
            error=str(e),
        )
        raise HTTPException(status_code=403, detail={"code": "forbidden"})
    except Exception as e:
        logger.exception(
            "Unexpected error during group details retrieval",
            user_id=current_user_id,
            group_id=group_id,
            error=str(e),
        )
        raise HTTPException(status_code=500, detail={"code": "server_error"})


@router.patch("/{group_id}", response_model=GroupUpdateResponse)
async def update_group(
    *,
    group_id: UUID = Path(..., description="Group UUID"),
    payload: UpdateGroupRequest,
    current_user_id: Annotated[str, Depends(get_current_user)],
    group_repo: Annotated[GroupRepository, Depends(get_group_repository)],
) -> GroupUpdateResponse:
    try:
        command = UpdateGroupCommand(
            group_id=str(group_id),
            requesting_user_id=current_user_id,
            name=payload.name,
            historical_exclusions_enabled=payload.historical_exclusions_enabled,
            historical_exclusions_lookback=payload.historical_exclusions_lookback,
        )
        use_case = UpdateGroupUseCase(group_repository=group_repo)
        group = await use_case.execute(command)

        return GroupUpdateResponse(
            id=group.id,
            name=group.name,
            historical_exclusions_enabled=group.historical_exclusions_enabled,
            historical_exclusions_lookback=group.historical_exclusions_lookback,
            updated_at=group.updated_at,
        )
    except GroupNotFoundError as e:
        logger.warning(
            "Group not found during update",
            user_id=current_user_id,
            group_id=group_id,
            error=str(e),
        )
        raise HTTPException(status_code=404, detail={"code": "group_not_found"})
    except ForbiddenError as e:
        logger.warning(
            "Forbidden access to update group",
            user_id=current_user_id,
            group_id=group_id,
            error=str(e),
        )
        raise HTTPException(status_code=403, detail={"code": "forbidden"})
    except InvalidGroupNameError as e:
        logger.warning(
            "Invalid group name during update",
            user_id=current_user_id,
            group_id=group_id,
            name=payload.name,
            error=str(e),
        )
        raise HTTPException(
            status_code=400,
            detail={
                "code": "invalid_payload",
                "field": "name",
                "message": "Group name must be 1-100 characters",
            },
        )
    except ValueError as e:
        logger.warning(
            "Validation error during group update",
            user_id=current_user_id,
            group_id=group_id,
            error=str(e),
        )
        if "historical_exclusions_lookback" in str(e):
            raise HTTPException(
                status_code=400,
                detail={
                    "code": "invalid_payload",
                    "field": "historical_exclusions_lookback",
                    "message": str(e),
                },
            )
        elif "At least one field" in str(e):
            raise HTTPException(
                status_code=400,
                detail={"code": "invalid_payload", "message": str(e)},
            )
        raise HTTPException(status_code=400, detail={"code": "invalid_payload", "message": str(e)})
    except Exception as e:
        logger.exception(
            "Unexpected error during group update",
            user_id=current_user_id,
            group_id=group_id,
            error=str(e),
        )
        raise HTTPException(status_code=500, detail={"code": "server_error"})


@router.delete("/{group_id}", status_code=204)
async def delete_group(
    group_id: UUID = Path(..., description="Group UUID"),
    *,
    current_user_id: Annotated[str, Depends(get_current_user)],
    group_repo: Annotated[GroupRepository, Depends(get_group_repository)],
) -> Response:
    try:
        command = DeleteGroupCommand(group_id=str(group_id), requesting_user_id=current_user_id)
        use_case = DeleteGroupUseCase(group_repository=group_repo)
        await use_case.execute(command)
        return Response(status_code=204)
    except GroupNotFoundError as e:
        logger.warning(
            "Group not found during deletion",
            user_id=current_user_id,
            group_id=group_id,
            error=str(e),
        )
        raise HTTPException(status_code=404, detail={"code": "group_not_found"})
    except ForbiddenError as e:
        logger.warning(
            "Forbidden access to delete group",
            user_id=current_user_id,
            group_id=group_id,
            error=str(e),
        )
        raise HTTPException(status_code=403, detail={"code": "forbidden"})
    except Exception as e:
        logger.exception(
            "Unexpected error during group deletion",
            user_id=current_user_id,
            group_id=group_id,
            error=str(e),
        )
        raise HTTPException(status_code=500, detail={"code": "server_error"})
