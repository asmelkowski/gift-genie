from __future__ import annotations

from collections.abc import AsyncGenerator
from datetime import datetime
from typing import Annotated

from fastapi import APIRouter, Depends, HTTPException, Query, Request, Response
from pydantic import BaseModel, ConfigDict, Field, StringConstraints
from sqlalchemy.ext.asyncio import AsyncSession

from gift_genie.application.dto.create_group_command import CreateGroupCommand
from gift_genie.application.dto.list_groups_query import ListGroupsQuery
from gift_genie.application.errors import InvalidGroupNameError
from gift_genie.application.use_cases.create_group import CreateGroupUseCase
from gift_genie.application.use_cases.list_user_groups import ListUserGroupsUseCase
from gift_genie.domain.interfaces.repositories import GroupRepository
from gift_genie.infrastructure.config.settings import get_settings
from gift_genie.infrastructure.database.repositories.groups import GroupRepositorySqlAlchemy
from gift_genie.infrastructure.database.session import get_async_session
from gift_genie.infrastructure.security.jwt import JWTService

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


class PaginationMeta(BaseModel):
    total: int
    page: int
    page_size: int
    total_pages: int


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


# Dependencies
async def get_current_user(request: Request) -> str:
    token = request.cookies.get("access_token")
    if not token:
        raise HTTPException(status_code=401, detail={"code": "unauthorized"})

    settings = get_settings()
    jwt_service = JWTService(settings.SECRET_KEY, settings.ALGORITHM)
    try:
        payload = jwt_service.verify_token(token)
        user_id = payload.get("sub")
        if not user_id:
            raise HTTPException(status_code=401, detail={"code": "unauthorized"})
        return user_id
    except ValueError:
        raise HTTPException(status_code=401, detail={"code": "unauthorized"})


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
):
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
        meta = PaginationMeta(
            total=total, page=page, page_size=page_size, total_pages=total_pages
        )
        return PaginatedGroupsResponse(data=data, meta=meta)
    except ValueError as e:
        raise HTTPException(
            status_code=400, detail={"code": "invalid_query_params", "errors": [str(e)]}
        )
    except Exception:
        raise HTTPException(status_code=500, detail={"code": "server_error"})


@router.post("", response_model=GroupDetailResponse, status_code=201)
async def create_group(
    payload: CreateGroupRequest,
    response: Response,
    *,
    current_user_id: Annotated[str, Depends(get_current_user)],
    group_repo: Annotated[GroupRepository, Depends(get_group_repository)],
):
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
    except InvalidGroupNameError:
        raise HTTPException(
            status_code=400,
            detail={"code": "invalid_payload", "field": "name", "message": "Group name must be 1-100 characters"},
        )
    except ValueError as e:
        if "historical_exclusions_lookback" in str(e):
            raise HTTPException(
                status_code=400,
                detail={"code": "invalid_payload", "field": "historical_exclusions_lookback", "message": str(e)},
            )
        raise HTTPException(
            status_code=400,
            detail={"code": "invalid_payload", "field": "name", "message": str(e)},
        )
    except Exception:
        raise HTTPException(status_code=500, detail={"code": "server_error"})
