from datetime import datetime
from typing import Annotated, AsyncGenerator
from uuid import UUID
from fastapi import APIRouter, Depends, HTTPException, Path, Query, Response
from loguru import logger
from pydantic import BaseModel, ConfigDict, EmailStr, StringConstraints, model_validator
from sqlalchemy.ext.asyncio import AsyncSession

from gift_genie.application.dto.create_member_command import CreateMemberCommand
from gift_genie.application.dto.get_member_query import GetMemberQuery
from gift_genie.application.dto.list_members_query import ListMembersQuery
from gift_genie.application.dto.update_member_command import UpdateMemberCommand
from gift_genie.application.errors import (
    CannotDeactivateMemberError,
    ForbiddenError,
    GroupNotFoundError,
    MemberEmailConflictError,
    MemberNameConflictError,
    MemberNotFoundError,
)
from gift_genie.application.use_cases.create_member import CreateMemberUseCase
from gift_genie.application.use_cases.delete_member import DeleteMemberUseCase
from gift_genie.application.use_cases.get_member import GetMemberUseCase
from gift_genie.application.use_cases.list_members import ListMembersUseCase
from gift_genie.application.use_cases.update_member import UpdateMemberUseCase
from gift_genie.domain.interfaces.repositories import GroupRepository, MemberRepository
from gift_genie.infrastructure.database.repositories.members import MemberRepositorySqlAlchemy
from gift_genie.infrastructure.database.session import get_async_session
from gift_genie.presentation.api.dependencies import require_permission
from gift_genie.presentation.api.v1.groups import get_group_repository
from gift_genie.presentation.api.v1.shared import PaginationMeta

router: APIRouter = APIRouter(prefix="/groups/{group_id}/members", tags=["members"])


async def get_member_repository(
    session: Annotated[AsyncSession, Depends(get_async_session)],
) -> AsyncGenerator[MemberRepository, None]:
    yield MemberRepositorySqlAlchemy(session)


class CreateMemberRequest(BaseModel):
    model_config = ConfigDict(extra="forbid")
    name: Annotated[str, StringConstraints(min_length=1, max_length=100, strip_whitespace=True)]
    email: EmailStr | None = None
    is_active: bool | None = None


class UpdateMemberRequest(BaseModel):
    model_config = ConfigDict(extra="forbid")
    name: (
        Annotated[str, StringConstraints(min_length=1, max_length=100, strip_whitespace=True)]
        | None
    ) = None
    email: EmailStr | None = None
    is_active: bool | None = None

    @model_validator(mode="after")
    def check_at_least_one_field(self) -> "UpdateMemberRequest":
        if all(v is None for v in [self.name, self.email, self.is_active]):
            raise ValueError("At least one field must be provided")
        return self


class MemberResponse(BaseModel):
    id: str
    group_id: str
    name: str
    email: str | None
    is_active: bool
    created_at: datetime


class PaginatedMembersResponse(BaseModel):
    data: list[MemberResponse]
    meta: PaginationMeta


@router.get("/{member_id}", response_model=MemberResponse)
async def get_member(
    group_id: UUID = Path(..., description="Group UUID"),
    member_id: UUID = Path(..., description="Member UUID"),
    *,
    current_user_id: Annotated[
        str, Depends(require_permission("members:read", resource_id_from_path=True))
    ],
    group_repo: Annotated[GroupRepository, Depends(get_group_repository)],
    member_repo: Annotated[MemberRepository, Depends(get_member_repository)],
) -> MemberResponse:
    use_case = GetMemberUseCase(group_repo, member_repo)
    query = GetMemberQuery(
        group_id=str(group_id),
        member_id=str(member_id),
        requesting_user_id=current_user_id,
    )

    try:
        member = await use_case.execute(query)
    except GroupNotFoundError as e:
        logger.warning(
            "Group not found during member retrieval",
            user_id=current_user_id,
            group_id=group_id,
            member_id=member_id,
            error=str(e),
        )
        raise HTTPException(status_code=404, detail={"code": "group_not_found"})
    except ForbiddenError as e:
        logger.warning(
            "Forbidden access to member",
            user_id=current_user_id,
            group_id=group_id,
            member_id=member_id,
            error=str(e),
        )
        raise HTTPException(status_code=403, detail={"code": "forbidden"})
    except MemberNotFoundError as e:
        logger.warning(
            "Member not found",
            user_id=current_user_id,
            group_id=group_id,
            member_id=member_id,
            error=str(e),
        )
        raise HTTPException(status_code=404, detail={"code": "member_not_found"})
    except Exception as e:
        logger.exception(
            "Unexpected error during member retrieval",
            user_id=current_user_id,
            group_id=group_id,
            member_id=member_id,
            error=str(e),
        )
        raise HTTPException(status_code=500, detail={"code": "server_error"})

    return MemberResponse(
        id=member.id,
        group_id=member.group_id,
        name=member.name,
        email=member.email,
        is_active=member.is_active,
        created_at=member.created_at,
    )


@router.patch("/{member_id}", response_model=MemberResponse)
async def update_member(
    *,
    group_id: UUID = Path(..., description="Group UUID"),
    member_id: UUID = Path(..., description="Member UUID"),
    request: UpdateMemberRequest,
    current_user_id: Annotated[
        str, Depends(require_permission("members:update", resource_id_from_path=True))
    ],
    group_repo: Annotated[GroupRepository, Depends(get_group_repository)],
    member_repo: Annotated[MemberRepository, Depends(get_member_repository)],
) -> MemberResponse:
    use_case = UpdateMemberUseCase(group_repo, member_repo)
    command = UpdateMemberCommand(
        group_id=str(group_id),
        member_id=str(member_id),
        requesting_user_id=current_user_id,
        name=request.name,
        email=request.email,
        is_active=request.is_active,
    )

    try:
        member = await use_case.execute(command)
    except GroupNotFoundError as e:
        logger.warning(
            "Group not found during member update",
            user_id=current_user_id,
            group_id=group_id,
            member_id=member_id,
            error=str(e),
        )
        raise HTTPException(status_code=404, detail={"code": "group_not_found"})
    except ForbiddenError as e:
        logger.warning(
            "Forbidden access to update member",
            user_id=current_user_id,
            group_id=group_id,
            member_id=member_id,
            error=str(e),
        )
        raise HTTPException(status_code=403, detail={"code": "forbidden"})
    except MemberNotFoundError as e:
        logger.warning(
            "Member not found during update",
            user_id=current_user_id,
            group_id=group_id,
            member_id=member_id,
            error=str(e),
        )
        raise HTTPException(status_code=404, detail={"code": "member_not_found"})
    except MemberNameConflictError as e:
        logger.warning(
            "Member name conflict during update",
            user_id=current_user_id,
            group_id=group_id,
            member_id=member_id,
            name=request.name,
            error=str(e),
        )
        raise HTTPException(status_code=409, detail={"code": "name_conflict_in_group"})
    except MemberEmailConflictError as e:
        logger.warning(
            "Member email conflict during update",
            user_id=current_user_id,
            group_id=group_id,
            member_id=member_id,
            email=request.email,
            error=str(e),
        )
        raise HTTPException(status_code=409, detail={"code": "email_conflict_in_group"})
    except CannotDeactivateMemberError as e:
        logger.warning(
            "Cannot deactivate member due to pending draw",
            user_id=current_user_id,
            group_id=group_id,
            member_id=member_id,
            error=str(e),
        )
        raise HTTPException(
            status_code=409, detail={"code": "cannot_deactivate_due_to_pending_draw"}
        )
    except Exception as e:
        logger.exception(
            "Unexpected error during member update",
            user_id=current_user_id,
            group_id=group_id,
            member_id=member_id,
            error=str(e),
        )
        raise HTTPException(status_code=500, detail={"code": "server_error"})

    return MemberResponse(
        id=member.id,
        group_id=member.group_id,
        name=member.name,
        email=member.email,
        is_active=member.is_active,
        created_at=member.created_at,
    )


@router.delete("/{member_id}", status_code=204)
async def delete_member(
    group_id: UUID = Path(..., description="Group UUID"),
    member_id: UUID = Path(..., description="Member UUID"),
    *,
    current_user_id: Annotated[
        str, Depends(require_permission("members:delete", resource_id_from_path=True))
    ],
    group_repo: Annotated[GroupRepository, Depends(get_group_repository)],
    member_repo: Annotated[MemberRepository, Depends(get_member_repository)],
) -> Response:
    from gift_genie.application.dto.delete_member_command import DeleteMemberCommand

    use_case = DeleteMemberUseCase(group_repo, member_repo)
    command = DeleteMemberCommand(
        group_id=str(group_id),
        member_id=str(member_id),
        requesting_user_id=current_user_id,
    )

    try:
        await use_case.execute(command)
    except GroupNotFoundError as e:
        logger.warning(
            "Group not found during member deletion",
            user_id=current_user_id,
            group_id=group_id,
            member_id=member_id,
            error=str(e),
        )
        raise HTTPException(status_code=404, detail={"code": "group_not_found"})
    except ForbiddenError as e:
        logger.warning(
            "Forbidden access to delete member",
            user_id=current_user_id,
            group_id=group_id,
            member_id=member_id,
            error=str(e),
        )
        raise HTTPException(status_code=403, detail={"code": "forbidden"})
    except MemberNotFoundError as e:
        logger.warning(
            "Member not found during deletion",
            user_id=current_user_id,
            group_id=group_id,
            member_id=member_id,
            error=str(e),
        )
        raise HTTPException(status_code=404, detail={"code": "member_not_found"})
    except Exception as e:
        logger.exception(
            "Unexpected error during member deletion",
            user_id=current_user_id,
            group_id=group_id,
            member_id=member_id,
            error=str(e),
        )
        raise HTTPException(status_code=500, detail={"code": "server_error"})

    return Response(status_code=204)


@router.get("", response_model=PaginatedMembersResponse)
async def list_members(
    group_id: UUID = Path(..., description="Group UUID"),
    is_active: bool | None = Query(None),
    search: str | None = Query(None),
    page: int = Query(1, ge=1),
    page_size: int = Query(10, ge=1, le=100),
    sort: str = Query("name", pattern=r"^-?(name|created_at)$"),
    *,
    current_user_id: Annotated[
        str, Depends(require_permission("members:read", resource_id_from_path=True))
    ],
    group_repo: Annotated[GroupRepository, Depends(get_group_repository)],
    member_repo: Annotated[MemberRepository, Depends(get_member_repository)],
) -> PaginatedMembersResponse:
    use_case = ListMembersUseCase(group_repo, member_repo)
    query = ListMembersQuery(
        group_id=str(group_id),
        requesting_user_id=current_user_id,
        is_active=is_active,
        search=search,
        page=page,
        page_size=page_size,
        sort=sort,
    )

    try:
        members, total = await use_case.execute(query)
    except GroupNotFoundError as e:
        logger.warning(
            "Group not found during members list",
            user_id=current_user_id,
            group_id=group_id,
            error=str(e),
        )
        raise HTTPException(status_code=404, detail={"code": "group_not_found"})
    except ForbiddenError as e:
        logger.warning(
            "Forbidden access to list members",
            user_id=current_user_id,
            group_id=group_id,
            error=str(e),
        )
        raise HTTPException(status_code=403, detail={"code": "forbidden"})
    except ValueError as e:
        logger.warning(
            "Invalid query parameters in list members",
            user_id=current_user_id,
            group_id=group_id,
            error=str(e),
        )
        raise HTTPException(
            status_code=400, detail={"code": "invalid_query_params", "errors": [str(e)]}
        )
    except Exception as e:
        logger.exception(
            "Unexpected error during members list",
            user_id=current_user_id,
            group_id=group_id,
            error=str(e),
        )
        raise HTTPException(status_code=500, detail={"code": "server_error"})

    total_pages = (total + page_size - 1) // page_size
    response_data = [
        MemberResponse(
            id=member.id,
            group_id=member.group_id,
            name=member.name,
            email=member.email,
            is_active=member.is_active,
            created_at=member.created_at,
        )
        for member in members
    ]

    return PaginatedMembersResponse(
        data=response_data,
        meta=PaginationMeta(
            total=total,
            page=page,
            page_size=page_size,
            total_pages=total_pages,
        ),
    )


@router.post("", response_model=MemberResponse, status_code=201)
async def create_member(
    *,
    group_id: UUID = Path(..., description="Group UUID"),
    request: CreateMemberRequest,
    response: Response,
    current_user_id: Annotated[
        str, Depends(require_permission("members:create", resource_id_from_path=True))
    ],
    group_repo: Annotated[GroupRepository, Depends(get_group_repository)],
    member_repo: Annotated[MemberRepository, Depends(get_member_repository)],
) -> MemberResponse:
    use_case = CreateMemberUseCase(group_repo, member_repo)
    command = CreateMemberCommand(
        group_id=str(group_id),
        requesting_user_id=current_user_id,
        name=request.name,
        email=request.email,
        is_active=request.is_active if request.is_active is not None else True,
    )

    try:
        member = await use_case.execute(command)
    except GroupNotFoundError as e:
        logger.warning(
            "Group not found during member creation",
            user_id=current_user_id,
            group_id=group_id,
            name=request.name,
            error=str(e),
        )
        raise HTTPException(status_code=404, detail={"code": "group_not_found"})
    except ForbiddenError as e:
        logger.warning(
            "Forbidden access to create member",
            user_id=current_user_id,
            group_id=group_id,
            name=request.name,
            error=str(e),
        )
        raise HTTPException(status_code=403, detail={"code": "forbidden"})
    except MemberNameConflictError as e:
        logger.warning(
            "Member name conflict during creation",
            user_id=current_user_id,
            group_id=group_id,
            name=request.name,
            error=str(e),
        )
        raise HTTPException(status_code=409, detail={"code": "name_conflict_in_group"})
    except MemberEmailConflictError as e:
        logger.warning(
            "Member email conflict during creation",
            user_id=current_user_id,
            group_id=group_id,
            email=request.email,
            error=str(e),
        )
        raise HTTPException(status_code=409, detail={"code": "email_conflict_in_group"})
    except Exception as e:
        logger.exception(
            "Unexpected error during member creation",
            user_id=current_user_id,
            group_id=group_id,
            name=request.name,
            error=str(e),
        )
        raise HTTPException(status_code=500, detail={"code": "server_error"})

    member_response = MemberResponse(
        id=member.id,
        group_id=member.group_id,
        name=member.name,
        email=member.email,
        is_active=member.is_active,
        created_at=member.created_at,
    )

    # Set Location header
    response.headers["Location"] = f"/api/v1/groups/{group_id}/members/{member.id}"

    return member_response
