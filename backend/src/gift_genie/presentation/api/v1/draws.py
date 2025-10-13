from collections.abc import AsyncGenerator
from datetime import datetime
from typing import Annotated, Literal
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, Path, Query, Response
from loguru import logger
from pydantic import BaseModel, ConfigDict
from sqlalchemy.ext.asyncio import AsyncSession

from gift_genie.application.dto.create_draw_command import CreateDrawCommand
from gift_genie.application.dto.delete_draw_command import DeleteDrawCommand
from gift_genie.application.dto.execute_draw_command import ExecuteDrawCommand
from gift_genie.application.dto.finalize_draw_command import FinalizeDrawCommand
from gift_genie.application.dto.get_draw_query import GetDrawQuery
from gift_genie.application.dto.list_assignments_query import ListAssignmentsQuery
from gift_genie.application.dto.list_draws_query import ListDrawsQuery
from gift_genie.application.dto.notify_draw_command import NotifyDrawCommand
from gift_genie.application.use_cases.create_draw import CreateDrawUseCase
from gift_genie.application.use_cases.delete_draw import DeleteDrawUseCase
from gift_genie.application.use_cases.execute_draw import ExecuteDrawUseCase
from gift_genie.application.use_cases.finalize_draw import FinalizeDrawUseCase
from gift_genie.application.use_cases.get_draw import GetDrawUseCase
from gift_genie.application.use_cases.list_assignments import (
    ListAssignmentsUseCase,
    AssignmentWithNames,
)
from gift_genie.application.use_cases.list_draws import ListDrawsUseCase
from gift_genie.application.use_cases.notify_draw import NotifyDrawUseCase
from gift_genie.domain.entities.enums import DrawStatus
from gift_genie.domain.interfaces.draw_algorithm import DrawAlgorithm
from gift_genie.domain.interfaces.notification_service import NotificationService
from gift_genie.domain.interfaces.repositories import AssignmentRepository, DrawRepository, ExclusionRepository, GroupRepository, MemberRepository
from gift_genie.infrastructure.algorithms.constraint_draw_algorithm import ConstraintDrawAlgorithm
from gift_genie.infrastructure.database.repositories.assignments import AssignmentRepositorySqlAlchemy
from gift_genie.infrastructure.database.repositories.draws import DrawRepositorySqlAlchemy
from gift_genie.infrastructure.database.repositories.exclusions import ExclusionRepositorySqlAlchemy

from gift_genie.infrastructure.database.repositories.members import MemberRepositorySqlAlchemy
from gift_genie.infrastructure.database.session import get_async_session
from gift_genie.infrastructure.services.email_notification_service import EmailNotificationService
from gift_genie.presentation.api.v1.shared import PaginationMeta, handle_application_exceptions
from gift_genie.presentation.api.v1.groups import get_current_user, get_group_repository

router = APIRouter(tags=["draws"])


# Pydantic Request Models
class CreateDrawRequest(BaseModel):
    model_config = ConfigDict(extra="forbid")
    seed: str | None = None


class ExecuteDrawRequest(BaseModel):
    model_config = ConfigDict(extra="forbid")
    seed: str | None = None


class FinalizeDrawRequest(BaseModel):
    model_config = ConfigDict(extra="forbid")
    pass


class NotifyDrawRequest(BaseModel):
    model_config = ConfigDict(extra="forbid")
    resend: bool = False


# Pydantic Response Models
class DrawResponse(BaseModel):
    id: str
    group_id: str
    status: str
    created_at: datetime
    finalized_at: datetime | None
    notification_sent_at: datetime | None


class AssignmentSummary(BaseModel):
    giver_member_id: str
    receiver_member_id: str


class ExecuteDrawResponse(BaseModel):
    draw: DrawResponse
    assignments: list[AssignmentSummary]


class PaginatedDrawsResponse(BaseModel):
    data: list[DrawResponse]
    meta: PaginationMeta


class NotifyDrawResponse(BaseModel):
    sent: int
    skipped: int


class AssignmentResponse(BaseModel):
    id: str
    draw_id: str
    giver_member_id: str
    receiver_member_id: str
    created_at: datetime
    giver_name: str | None = None
    receiver_name: str | None = None


class ListAssignmentsResponse(BaseModel):
    data: list[AssignmentResponse]
    meta: dict


# Dependency Injections
async def get_draw_repository(
    session: Annotated[AsyncSession, Depends(get_async_session)],
) -> AsyncGenerator[DrawRepository, None]:
    yield DrawRepositorySqlAlchemy(session)


async def get_assignment_repository(
    session: Annotated[AsyncSession, Depends(get_async_session)],
) -> AsyncGenerator[AssignmentRepository, None]:
    yield AssignmentRepositorySqlAlchemy(session)


async def get_member_repository(
    session: Annotated[AsyncSession, Depends(get_async_session)],
) -> AsyncGenerator[MemberRepository, None]:
    yield MemberRepositorySqlAlchemy(session)


async def get_exclusion_repository(
    session: Annotated[AsyncSession, Depends(get_async_session)],
) -> AsyncGenerator[ExclusionRepository, None]:
    yield ExclusionRepositorySqlAlchemy(session)


async def get_notification_service() -> AsyncGenerator[NotificationService, None]:
    yield EmailNotificationService()


async def get_draw_algorithm() -> AsyncGenerator[DrawAlgorithm, None]:
    yield ConstraintDrawAlgorithm()


# Use Cases
async def get_list_draws_use_case(
    group_repo: Annotated[GroupRepository, Depends(get_group_repository)],
    draw_repo: Annotated[DrawRepository, Depends(get_draw_repository)],
) -> AsyncGenerator[ListDrawsUseCase, None]:
    yield ListDrawsUseCase(
        group_repository=group_repo,
        draw_repository=draw_repo,
    )


async def get_create_draw_use_case(
    group_repo: Annotated[GroupRepository, Depends(get_group_repository)],
    draw_repo: Annotated[DrawRepository, Depends(get_draw_repository)],
) -> AsyncGenerator[CreateDrawUseCase, None]:
    yield CreateDrawUseCase(
        group_repository=group_repo,
        draw_repository=draw_repo,
    )


async def get_get_draw_use_case(
    draw_repo: Annotated[DrawRepository, Depends(get_draw_repository)],
    group_repo: Annotated[GroupRepository, Depends(get_group_repository)],
) -> AsyncGenerator[GetDrawUseCase, None]:
    yield GetDrawUseCase(
        draw_repository=draw_repo,
        group_repository=group_repo,
    )


async def get_delete_draw_use_case(
    draw_repo: Annotated[DrawRepository, Depends(get_draw_repository)],
    group_repo: Annotated[GroupRepository, Depends(get_group_repository)],
) -> AsyncGenerator[DeleteDrawUseCase, None]:
    yield DeleteDrawUseCase(
        draw_repository=draw_repo,
        group_repository=group_repo,
    )


async def get_execute_draw_use_case(
    group_repo: Annotated[GroupRepository, Depends(get_group_repository)],
    draw_repo: Annotated[DrawRepository, Depends(get_draw_repository)],
    member_repo: Annotated[MemberRepository, Depends(get_member_repository)],
    exclusion_repo: Annotated[ExclusionRepository, Depends(get_exclusion_repository)],
    assignment_repo: Annotated[AssignmentRepository, Depends(get_assignment_repository)],
    draw_algorithm: Annotated[DrawAlgorithm, Depends(get_draw_algorithm)],
) -> AsyncGenerator[ExecuteDrawUseCase, None]:
    yield ExecuteDrawUseCase(
        group_repository=group_repo,
        draw_repository=draw_repo,
        member_repository=member_repo,
        exclusion_repository=exclusion_repo,
        assignment_repository=assignment_repo,
        draw_algorithm=draw_algorithm,
    )


async def get_finalize_draw_use_case(
    draw_repo: Annotated[DrawRepository, Depends(get_draw_repository)],
    group_repo: Annotated[GroupRepository, Depends(get_group_repository)],
    assignment_repo: Annotated[AssignmentRepository, Depends(get_assignment_repository)],
) -> AsyncGenerator[FinalizeDrawUseCase, None]:
    yield FinalizeDrawUseCase(
        draw_repository=draw_repo,
        group_repository=group_repo,
        assignment_repository=assignment_repo,
    )


async def get_notify_draw_use_case(
    draw_repo: Annotated[DrawRepository, Depends(get_draw_repository)],
    group_repo: Annotated[GroupRepository, Depends(get_group_repository)],
    assignment_repo: Annotated[AssignmentRepository, Depends(get_assignment_repository)],
    member_repo: Annotated[MemberRepository, Depends(get_member_repository)],
    notification_service: Annotated[NotificationService, Depends(get_notification_service)],
) -> AsyncGenerator[NotifyDrawUseCase, None]:
    yield NotifyDrawUseCase(
        draw_repository=draw_repo,
        group_repository=group_repo,
        assignment_repository=assignment_repo,
        member_repository=member_repo,
        notification_service=notification_service,
    )


async def get_list_assignments_use_case(
    draw_repo: Annotated[DrawRepository, Depends(get_draw_repository)],
    group_repo: Annotated[GroupRepository, Depends(get_group_repository)],
    assignment_repo: Annotated[AssignmentRepository, Depends(get_assignment_repository)],
    member_repo: Annotated[MemberRepository, Depends(get_member_repository)],
) -> AsyncGenerator[ListAssignmentsUseCase, None]:
    yield ListAssignmentsUseCase(
        draw_repository=draw_repo,
        group_repository=group_repo,
        assignment_repository=assignment_repo,
        member_repository=member_repo,
    )


# API Endpoints

@router.get("/groups/{group_id}/draws", response_model=PaginatedDrawsResponse)
@handle_application_exceptions
async def list_draws(
    group_id: UUID = Path(..., description="Group UUID"),
    status: Literal["pending", "finalized"] | None = Query(None),
    page: int = Query(1, ge=1),
    page_size: int = Query(10, ge=1, le=100),
    sort: str = Query("-created_at", pattern=r"^-?created_at$"),
    *,
    current_user_id: Annotated[str, Depends(get_current_user)],
    use_case: Annotated[ListDrawsUseCase, Depends(get_list_draws_use_case)],
):
    query = ListDrawsQuery(
        group_id=str(group_id),
        requesting_user_id=current_user_id,
        status=DrawStatus(status) if status else None,
        page=page,
        page_size=page_size,
        sort=sort,
    )

    draws, total = await use_case.execute(query)

    return PaginatedDrawsResponse(
        data=[
            DrawResponse(
                id=draw.id,
                group_id=draw.group_id,
                status=draw.status.value,
                created_at=draw.created_at,
                finalized_at=draw.finalized_at,
                notification_sent_at=draw.notification_sent_at,
            )
            for draw in draws
        ],
        meta=PaginationMeta(
            total=total,
            page=page,
            page_size=page_size,
            total_pages=(total + page_size - 1) // page_size,
        ),
    )


@router.post("/groups/{group_id}/draws", response_model=DrawResponse, status_code=201)
@handle_application_exceptions
async def create_draw(
    group_id: UUID = Path(..., description="Group UUID"),
    payload: CreateDrawRequest = Depends(),
    *,
    current_user_id: Annotated[str, Depends(get_current_user)],
    use_case: Annotated[CreateDrawUseCase, Depends(get_create_draw_use_case)],
    response: Response,
):
    command = CreateDrawCommand(
        group_id=str(group_id),
        requesting_user_id=current_user_id,
        seed=payload.seed,
    )

    draw = await use_case.execute(command)

    # Set Location header
    response.headers["Location"] = f"/api/v1/draws/{draw.id}"

    return DrawResponse(
        id=draw.id,
        group_id=draw.group_id,
        status=draw.status.value,
        created_at=draw.created_at,
        finalized_at=draw.finalized_at,
        notification_sent_at=draw.notification_sent_at,
    )


@router.get("/draws/{draw_id}", response_model=DrawResponse)
@handle_application_exceptions
async def get_draw(
    draw_id: UUID = Path(..., description="Draw UUID"),
    *,
    current_user_id: Annotated[str, Depends(get_current_user)],
    use_case: Annotated[GetDrawUseCase, Depends(get_get_draw_use_case)],
):
    query = GetDrawQuery(
        draw_id=str(draw_id),
        requesting_user_id=current_user_id,
    )

    draw = await use_case.execute(query)

    return DrawResponse(
        id=draw.id,
        group_id=draw.group_id,
        status=draw.status.value,
        created_at=draw.created_at,
        finalized_at=draw.finalized_at,
        notification_sent_at=draw.notification_sent_at,
    )


@router.delete("/draws/{draw_id}", status_code=204)
@handle_application_exceptions
async def delete_draw(
    draw_id: UUID = Path(..., description="Draw UUID"),
    *,
    current_user_id: Annotated[str, Depends(get_current_user)],
    use_case: Annotated[DeleteDrawUseCase, Depends(get_delete_draw_use_case)],
):
    command = DeleteDrawCommand(
        draw_id=str(draw_id),
        requesting_user_id=current_user_id,
    )

    await use_case.execute(command)


@router.post("/draws/{draw_id}/execute", response_model=ExecuteDrawResponse)
@handle_application_exceptions
async def execute_draw(
    draw_id: UUID = Path(..., description="Draw UUID"),
    payload: ExecuteDrawRequest = Depends(),
    *,
    current_user_id: Annotated[str, Depends(get_current_user)],
    use_case: Annotated[ExecuteDrawUseCase, Depends(get_execute_draw_use_case)],
):
    command = ExecuteDrawCommand(
        draw_id=str(draw_id),
        requesting_user_id=current_user_id,
        seed=payload.seed,
    )

    draw, assignments = await use_case.execute(command)

    return ExecuteDrawResponse(
        draw=DrawResponse(
            id=draw.id,
            group_id=draw.group_id,
            status=draw.status.value,
            created_at=draw.created_at,
            finalized_at=draw.finalized_at,
            notification_sent_at=draw.notification_sent_at,
        ),
        assignments=[
            AssignmentSummary(
                giver_member_id=assignment.giver_member_id,
                receiver_member_id=assignment.receiver_member_id,
            )
            for assignment in assignments
        ],
    )


@router.post("/draws/{draw_id}/finalize", response_model=DrawResponse)
@handle_application_exceptions
async def finalize_draw(
    draw_id: UUID = Path(..., description="Draw UUID"),
    payload: FinalizeDrawRequest = Depends(),
    *,
    current_user_id: Annotated[str, Depends(get_current_user)],
    use_case: Annotated[FinalizeDrawUseCase, Depends(get_finalize_draw_use_case)],
):
    command = FinalizeDrawCommand(
        draw_id=str(draw_id),
        requesting_user_id=current_user_id,
    )

    draw = await use_case.execute(command)

    return DrawResponse(
        id=draw.id,
        group_id=draw.group_id,
        status=draw.status.value,
        created_at=draw.created_at,
        finalized_at=draw.finalized_at,
        notification_sent_at=draw.notification_sent_at,
    )


@router.post("/draws/{draw_id}/notify", response_model=NotifyDrawResponse, status_code=202)
@handle_application_exceptions
async def notify_draw(
    payload: NotifyDrawRequest,
    draw_id: UUID = Path(..., description="Draw UUID"),
    *,
    current_user_id: Annotated[str, Depends(get_current_user)],
    use_case: Annotated[NotifyDrawUseCase, Depends(get_notify_draw_use_case)],
):
    print(payload)
    command = NotifyDrawCommand(
        draw_id=str(draw_id),
        requesting_user_id=current_user_id,
        resend=payload.resend,
    )

    sent, skipped = await use_case.execute(command)

    return NotifyDrawResponse(sent=sent, skipped=skipped)


@router.get("/draws/{draw_id}/assignments", response_model=ListAssignmentsResponse)
@handle_application_exceptions
async def list_assignments(
    draw_id: UUID = Path(..., description="Draw UUID"),
    include: Literal["names", "none"] = Query("none", description="Include member names"),
    *,
    current_user_id: Annotated[str, Depends(get_current_user)],
    use_case: Annotated[ListAssignmentsUseCase, Depends(get_list_assignments_use_case)],
):
    query = ListAssignmentsQuery(
        draw_id=str(draw_id),
        requesting_user_id=current_user_id,
        include_names=(include == "names"),
    )

    assignments = await use_case.execute(query)

    # Transform to response models
    data = []
    for assignment in assignments:
        if isinstance(assignment, AssignmentWithNames):
            data.append(
                AssignmentResponse(
                    id=assignment.id,
                    draw_id=assignment.draw_id,
                    giver_member_id=assignment.giver_member_id,
                    receiver_member_id=assignment.receiver_member_id,
                    created_at=assignment.created_at,
                    giver_name=assignment.giver_name,
                    receiver_name=assignment.receiver_name,
                )
            )
        else:
            data.append(
                AssignmentResponse(
                    id=assignment.id,
                    draw_id=assignment.draw_id,
                    giver_member_id=assignment.giver_member_id,
                    receiver_member_id=assignment.receiver_member_id,
                    created_at=assignment.created_at,
                )
            )

    return ListAssignmentsResponse(
        data=data,
        meta={"total": len(data)},
    )
