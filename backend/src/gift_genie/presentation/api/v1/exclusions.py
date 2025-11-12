from __future__ import annotations

from collections.abc import AsyncGenerator
from datetime import datetime
from typing import Annotated
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, Path, Query, Request, Response
from pydantic import BaseModel, ConfigDict
from sqlalchemy.ext.asyncio import AsyncSession
from loguru import logger

from gift_genie.application.dto.create_exclusion_command import CreateExclusionCommand
from gift_genie.application.dto.create_exclusions_bulk_command import (
    CreateExclusionsBulkCommand,
    ExclusionItem,
)
from gift_genie.application.dto.delete_exclusion_command import DeleteExclusionCommand
from gift_genie.application.dto.list_exclusions_query import ListExclusionsQuery
from gift_genie.application.errors import (
    DuplicateExclusionError,
    ExclusionConflictsError,
    ExclusionNotFoundError,
    ForbiddenError,
    GroupNotFoundError,
    MemberNotFoundError,
    SelfExclusionNotAllowedError,
)
from gift_genie.application.use_cases.create_exclusion import CreateExclusionUseCase
from gift_genie.application.use_cases.create_exclusions_bulk import CreateExclusionsBulkUseCase
from gift_genie.application.use_cases.delete_exclusion import DeleteExclusionUseCase
from gift_genie.application.use_cases.list_exclusions import ListExclusionsUseCase
from gift_genie.domain.entities.enums import ExclusionType
from gift_genie.domain.interfaces.repositories import (
    ExclusionRepository,
    GroupRepository,
    MemberRepository,
)
from gift_genie.infrastructure.database.repositories.exclusions import ExclusionRepositorySqlAlchemy
from gift_genie.infrastructure.database.repositories.groups import GroupRepositorySqlAlchemy
from gift_genie.infrastructure.database.repositories.members import MemberRepositorySqlAlchemy
from gift_genie.infrastructure.database.session import get_async_session
from gift_genie.presentation.api.v1.shared import PaginationMeta


router = APIRouter(prefix="/groups/{group_id}/exclusions", tags=["exclusions"])


# Pydantic Models
class ExclusionResponse(BaseModel):
    id: str
    group_id: str
    giver_member_id: str
    receiver_member_id: str
    exclusion_type: str
    is_mutual: bool
    created_at: datetime
    created_by_user_id: str | None


class PaginatedExclusionsResponse(BaseModel):
    data: list[ExclusionResponse]
    meta: PaginationMeta


class CreateExclusionRequest(BaseModel):
    model_config = ConfigDict(extra="forbid")
    giver_member_id: str
    receiver_member_id: str
    is_mutual: bool = False


class CreateExclusionResponse(BaseModel):
    created: list[ExclusionResponse]
    mutual: bool


class ExclusionItemRequest(BaseModel):
    giver_member_id: str
    receiver_member_id: str
    is_mutual: bool = False


class CreateExclusionsBulkRequest(BaseModel):
    model_config = ConfigDict(extra="forbid")
    items: list[ExclusionItemRequest]


class CreateExclusionsBulkResponse(BaseModel):
    created: list[ExclusionResponse]


# Dependencies
async def get_current_user(request: Request) -> str:
    token = request.cookies.get("access_token")
    if not token:
        raise HTTPException(status_code=401, detail={"code": "unauthorized"})

    from gift_genie.infrastructure.config.settings import get_settings
    from gift_genie.infrastructure.security.jwt import JWTService

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


async def get_group_repository(
    session: Annotated[AsyncSession, Depends(get_async_session)],
) -> AsyncGenerator[GroupRepository, None]:
    yield GroupRepositorySqlAlchemy(session)


async def get_member_repository(
    session: Annotated[AsyncSession, Depends(get_async_session)],
) -> AsyncGenerator[MemberRepository, None]:
    yield MemberRepositorySqlAlchemy(session)


async def get_exclusion_repository(
    session: Annotated[AsyncSession, Depends(get_async_session)],
) -> AsyncGenerator[ExclusionRepository, None]:
    yield ExclusionRepositorySqlAlchemy(session)


@router.get("", response_model=PaginatedExclusionsResponse)
async def list_exclusions(
    group_id: UUID = Path(..., description="Group UUID"),
    type: ExclusionType | None = Query(None, alias="type"),
    giver_member_id: str | None = Query(None),
    receiver_member_id: str | None = Query(None),
    page: int = Query(1, ge=1),
    page_size: int = Query(10, ge=1, le=100),
    sort: str = Query("exclusion_type,name"),
    *,
    current_user_id: Annotated[str, Depends(get_current_user)],
    group_repo: Annotated[GroupRepository, Depends(get_group_repository)],
    exclusion_repo: Annotated[ExclusionRepository, Depends(get_exclusion_repository)],
) -> PaginatedExclusionsResponse:
    try:
        query = ListExclusionsQuery(
            group_id=str(group_id),
            requesting_user_id=current_user_id,
            exclusion_type=type,
            giver_member_id=giver_member_id,
            receiver_member_id=receiver_member_id,
            page=page,
            page_size=page_size,
            sort=sort,
        )
        use_case = ListExclusionsUseCase(
            group_repository=group_repo, exclusion_repository=exclusion_repo
        )
        exclusions, total = await use_case.execute(query)

        data = [
            ExclusionResponse(
                id=e.id,
                group_id=e.group_id,
                giver_member_id=e.giver_member_id,
                receiver_member_id=e.receiver_member_id,
                exclusion_type=e.exclusion_type.value,
                is_mutual=e.is_mutual,
                created_at=e.created_at,
                created_by_user_id=e.created_by_user_id,
            )
            for e in exclusions
        ]
        total_pages = (total + page_size - 1) // page_size
        meta = PaginationMeta(total=total, page=page, page_size=page_size, total_pages=total_pages)
        return PaginatedExclusionsResponse(data=data, meta=meta)
    except ValueError as e:
        logger.exception(
            "Invalid query parameters in exclusions list",
            user_id=current_user_id,
            group_id=group_id,
            error=str(e),
        )
        raise HTTPException(
            status_code=400, detail={"code": "invalid_query_params", "errors": [str(e)]}
        )
    except ForbiddenError as e:
        logger.warning(
            "Forbidden access to exclusions list",
            user_id=current_user_id,
            group_id=group_id,
            error=str(e),
        )
        raise HTTPException(status_code=403, detail={"code": "forbidden"})
    except GroupNotFoundError as e:
        logger.warning(
            "Group not found during exclusions list",
            user_id=current_user_id,
            group_id=group_id,
            error=str(e),
        )
        raise HTTPException(status_code=404, detail={"code": "group_not_found"})
    except Exception as e:
        logger.exception(
            "Unexpected error during exclusions list",
            user_id=current_user_id,
            group_id=group_id,
            error=str(e),
        )
        raise HTTPException(status_code=500, detail={"code": "server_error"})


@router.post("", response_model=CreateExclusionResponse, status_code=201)
async def create_exclusion(
    *,
    group_id: UUID = Path(..., description="Group UUID"),
    payload: CreateExclusionRequest,
    current_user_id: Annotated[str, Depends(get_current_user)],
    group_repo: Annotated[GroupRepository, Depends(get_group_repository)],
    member_repo: Annotated[MemberRepository, Depends(get_member_repository)],
    exclusion_repo: Annotated[ExclusionRepository, Depends(get_exclusion_repository)],
) -> CreateExclusionResponse:
    try:
        command = CreateExclusionCommand(
            group_id=str(group_id),
            requesting_user_id=current_user_id,
            giver_member_id=payload.giver_member_id,
            receiver_member_id=payload.receiver_member_id,
            is_mutual=payload.is_mutual,
        )
        use_case = CreateExclusionUseCase(
            group_repository=group_repo,
            member_repository=member_repo,
            exclusion_repository=exclusion_repo,
        )
        exclusions = await use_case.execute(command)

        data = [
            ExclusionResponse(
                id=e.id,
                group_id=e.group_id,
                giver_member_id=e.giver_member_id,
                receiver_member_id=e.receiver_member_id,
                exclusion_type=e.exclusion_type.value,
                is_mutual=e.is_mutual,
                created_at=e.created_at,
                created_by_user_id=e.created_by_user_id,
            )
            for e in exclusions
        ]
        return CreateExclusionResponse(created=data, mutual=payload.is_mutual)
    except ForbiddenError as e:
        logger.warning(
            "Forbidden access to create exclusion",
            user_id=current_user_id,
            group_id=group_id,
            giver_member_id=payload.giver_member_id,
            receiver_member_id=payload.receiver_member_id,
            error=str(e),
        )
        raise HTTPException(status_code=403, detail={"code": "forbidden"})
    except (GroupNotFoundError, MemberNotFoundError) as e:
        logger.warning(
            "Group or member not found during exclusion creation",
            user_id=current_user_id,
            group_id=group_id,
            giver_member_id=payload.giver_member_id,
            receiver_member_id=payload.receiver_member_id,
            error=str(e),
        )
        raise HTTPException(status_code=404, detail={"code": "group_or_member_not_found"})
    except DuplicateExclusionError as e:
        logger.warning(
            "Duplicate exclusion during creation",
            user_id=current_user_id,
            group_id=group_id,
            giver_member_id=payload.giver_member_id,
            receiver_member_id=payload.receiver_member_id,
            error=str(e),
        )
        raise HTTPException(status_code=409, detail={"code": "duplicate_exclusion"})
    except SelfExclusionNotAllowedError as e:
        logger.warning(
            "Self exclusion not allowed",
            user_id=current_user_id,
            group_id=group_id,
            giver_member_id=payload.giver_member_id,
            receiver_member_id=payload.receiver_member_id,
            error=str(e),
        )
        raise HTTPException(status_code=409, detail={"code": "self_exclusion_not_allowed"})
    except ValueError as e:
        logger.warning(
            "Validation error during exclusion creation",
            user_id=current_user_id,
            group_id=group_id,
            giver_member_id=payload.giver_member_id,
            receiver_member_id=payload.receiver_member_id,
            error=str(e),
        )
        raise HTTPException(status_code=400, detail={"code": "invalid_payload", "message": str(e)})
    except Exception as e:
        logger.exception(
            "Unexpected error during exclusion creation",
            user_id=current_user_id,
            group_id=group_id,
            giver_member_id=payload.giver_member_id,
            receiver_member_id=payload.receiver_member_id,
            error=str(e),
        )
        raise HTTPException(status_code=500, detail={"code": "server_error"})


@router.post("/bulk", response_model=CreateExclusionsBulkResponse, status_code=201)
async def create_exclusions_bulk(
    *,
    group_id: UUID = Path(..., description="Group UUID"),
    payload: CreateExclusionsBulkRequest,
    current_user_id: Annotated[str, Depends(get_current_user)],
    group_repo: Annotated[GroupRepository, Depends(get_group_repository)],
    member_repo: Annotated[MemberRepository, Depends(get_member_repository)],
    exclusion_repo: Annotated[ExclusionRepository, Depends(get_exclusion_repository)],
) -> CreateExclusionsBulkResponse:
    try:
        items = [
            ExclusionItem(
                giver_member_id=item.giver_member_id,
                receiver_member_id=item.receiver_member_id,
                is_mutual=item.is_mutual,
            )
            for item in payload.items
        ]
        command = CreateExclusionsBulkCommand(
            group_id=str(group_id),
            requesting_user_id=current_user_id,
            items=items,
        )
        use_case = CreateExclusionsBulkUseCase(
            group_repository=group_repo,
            member_repository=member_repo,
            exclusion_repository=exclusion_repo,
        )
        exclusions = await use_case.execute(command)

        data = [
            ExclusionResponse(
                id=e.id,
                group_id=e.group_id,
                giver_member_id=e.giver_member_id,
                receiver_member_id=e.receiver_member_id,
                exclusion_type=e.exclusion_type.value,
                is_mutual=e.is_mutual,
                created_at=e.created_at,
                created_by_user_id=e.created_by_user_id,
            )
            for e in exclusions
        ]
        return CreateExclusionsBulkResponse(created=data)
    except ForbiddenError as e:
        logger.warning(
            "Forbidden access to bulk create exclusions",
            user_id=current_user_id,
            group_id=group_id,
            error=str(e),
        )
        raise HTTPException(status_code=403, detail={"code": "forbidden"})
    except (GroupNotFoundError, MemberNotFoundError) as e:
        logger.warning(
            "Group or member not found during bulk exclusion creation",
            user_id=current_user_id,
            group_id=group_id,
            error=str(e),
        )
        raise HTTPException(status_code=404, detail={"code": "group_or_member_not_found"})
    except ExclusionConflictsError as e:
        logger.warning(
            "Exclusion conflicts during bulk creation",
            user_id=current_user_id,
            group_id=group_id,
            conflicts=e.conflicts,
            error=str(e),
        )
        raise HTTPException(
            status_code=409, detail={"code": "conflicts_present", "details": e.conflicts}
        )
    except ValueError as e:
        logger.warning(
            "Validation error during bulk exclusion creation",
            user_id=current_user_id,
            group_id=group_id,
            error=str(e),
        )
        raise HTTPException(status_code=400, detail={"code": "invalid_payload", "message": str(e)})
    except Exception as e:
        logger.exception(
            "Unexpected error during bulk exclusion creation",
            user_id=current_user_id,
            group_id=group_id,
            error=str(e),
        )
        raise HTTPException(status_code=500, detail={"code": "server_error"})


@router.delete("/{exclusion_id}", status_code=204)
async def delete_exclusion(
    group_id: UUID = Path(..., description="Group UUID"),
    exclusion_id: UUID = Path(..., description="Exclusion UUID"),
    *,
    current_user_id: Annotated[str, Depends(get_current_user)],
    group_repo: Annotated[GroupRepository, Depends(get_group_repository)],
    exclusion_repo: Annotated[ExclusionRepository, Depends(get_exclusion_repository)],
) -> Response:
    try:
        command = DeleteExclusionCommand(
            group_id=str(group_id),
            exclusion_id=str(exclusion_id),
            requesting_user_id=current_user_id,
        )
        use_case = DeleteExclusionUseCase(
            group_repository=group_repo, exclusion_repository=exclusion_repo
        )
        await use_case.execute(command)
        return Response(status_code=204)
    except ForbiddenError as e:
        logger.warning(
            "Forbidden access to delete exclusion",
            user_id=current_user_id,
            group_id=group_id,
            exclusion_id=exclusion_id,
            error=str(e),
        )
        raise HTTPException(status_code=403, detail={"code": "forbidden"})
    except ExclusionNotFoundError as e:
        logger.warning(
            "Exclusion not found during deletion",
            user_id=current_user_id,
            group_id=group_id,
            exclusion_id=exclusion_id,
            error=str(e),
        )
        raise HTTPException(status_code=404, detail={"code": "exclusion_not_found"})
    except Exception as e:
        logger.exception(
            "Unexpected error during exclusion deletion",
            user_id=current_user_id,
            group_id=group_id,
            exclusion_id=exclusion_id,
            error=str(e),
        )
        raise HTTPException(status_code=500, detail={"code": "server_error"})
