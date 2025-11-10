from fastapi import FastAPI, Request
from fastapi.responses import JSONResponse
from gift_genie.application.errors import (
    AssignmentsAlreadyExistError,
    AuthorizationError,
    CannotDeactivateMemberError,
    CannotDeleteFinalizedDrawError,
    ConflictError,
    DrawAlreadyFinalizedError,
    DrawImpossibleError,
    DrawNotFinalizedError,
    DrawNotFoundError,
    DuplicateExclusionError,
    EmailConflictError,
    ExclusionConflictsError,
    ExclusionNotFoundError,
    ForbiddenError,
    GroupNotFoundError,
    InvalidCredentialsError,
    InvalidGroupNameError,
    InvalidMemberNameError,
    MemberEmailConflictError,
    MemberNameConflictError,
    MemberNotFoundError,
    NoAssignmentsToFinalizeError,
    NoValidDrawConfigurationError,
    SelfExclusionNotAllowedError,
    ValidationError,
)


def setup_exception_handlers(app: FastAPI) -> None:
    """Register all exception handlers for the FastAPI application."""

    # Exception handlers for application errors
    @app.exception_handler(EmailConflictError)
    async def handle_email_conflict_error(
        request: Request, exc: EmailConflictError
    ) -> JSONResponse:
        return JSONResponse(
            status_code=409,
            content={"detail": {"code": "email_conflict", "message": str(exc)}},
        )

    @app.exception_handler(InvalidCredentialsError)
    async def handle_invalid_credentials_error(
        request: Request, exc: InvalidCredentialsError
    ) -> JSONResponse:
        return JSONResponse(
            status_code=401,
            content={"detail": {"code": "invalid_credentials", "message": str(exc)}},
        )

    @app.exception_handler(CannotDeleteFinalizedDrawError)
    async def handle_cannot_delete_finalized_draw_error(
        request: Request, exc: CannotDeleteFinalizedDrawError
    ) -> JSONResponse:
        return JSONResponse(
            status_code=409,
            content={"detail": {"code": "cannotdeletefinalizeddrawerror", "message": str(exc)}},
        )

    @app.exception_handler(DrawAlreadyFinalizedError)
    async def handle_draw_already_finalized_error(
        request: Request, exc: DrawAlreadyFinalizedError
    ) -> JSONResponse:
        return JSONResponse(
            status_code=409,
            content={"detail": {"code": "drawalreadyfinalizederror", "message": str(exc)}},
        )

    @app.exception_handler(InvalidGroupNameError)
    async def handle_invalid_group_name_error(
        request: Request, exc: InvalidGroupNameError
    ) -> JSONResponse:
        return JSONResponse(
            status_code=400,
            content={"detail": {"code": "invalid_group_name", "message": str(exc)}},
        )

    @app.exception_handler(GroupNotFoundError)
    async def handle_group_not_found_error(
        request: Request, exc: GroupNotFoundError
    ) -> JSONResponse:
        return JSONResponse(
            status_code=404,
            content={
                "detail": {"code": "group_not_found", "message": str(exc) or "Group not found"}
            },
        )

    @app.exception_handler(ForbiddenError)
    async def handle_forbidden_error(request: Request, exc: ForbiddenError) -> JSONResponse:
        return JSONResponse(
            status_code=403,
            content={"detail": {"code": "forbidden", "message": str(exc) or "Access forbidden"}},
        )

    @app.exception_handler(MemberNotFoundError)
    async def handle_member_not_found_error(
        request: Request, exc: MemberNotFoundError
    ) -> JSONResponse:
        return JSONResponse(
            status_code=404,
            content={
                "detail": {"code": "member_not_found", "message": str(exc) or "Member not found"}
            },
        )

    @app.exception_handler(MemberNameConflictError)
    async def handle_member_name_conflict_error(
        request: Request, exc: MemberNameConflictError
    ) -> JSONResponse:
        return JSONResponse(
            status_code=409,
            content={"detail": {"code": "member_name_conflict", "message": str(exc)}},
        )

    @app.exception_handler(MemberEmailConflictError)
    async def handle_member_email_conflict_error(
        request: Request, exc: MemberEmailConflictError
    ) -> JSONResponse:
        return JSONResponse(
            status_code=409,
            content={"detail": {"code": "member_email_conflict", "message": str(exc)}},
        )

    @app.exception_handler(CannotDeactivateMemberError)
    async def handle_cannot_deactivate_member_error(
        request: Request, exc: CannotDeactivateMemberError
    ) -> JSONResponse:
        return JSONResponse(
            status_code=409,
            content={"detail": {"code": "cannot_deactivate_member", "message": str(exc)}},
        )

    @app.exception_handler(InvalidMemberNameError)
    async def handle_invalid_member_name_error(
        request: Request, exc: InvalidMemberNameError
    ) -> JSONResponse:
        return JSONResponse(
            status_code=400,
            content={"detail": {"code": "invalid_member_name", "message": str(exc)}},
        )

    @app.exception_handler(ExclusionNotFoundError)
    async def handle_exclusion_not_found_error(
        request: Request, exc: ExclusionNotFoundError
    ) -> JSONResponse:
        return JSONResponse(
            status_code=404,
            content={
                "detail": {
                    "code": "exclusion_not_found",
                    "message": str(exc) or "Exclusion not found",
                }
            },
        )

    @app.exception_handler(DuplicateExclusionError)
    async def handle_duplicate_exclusion_error(
        request: Request, exc: DuplicateExclusionError
    ) -> JSONResponse:
        return JSONResponse(
            status_code=409,
            content={"detail": {"code": "duplicate_exclusion", "message": str(exc)}},
        )

    @app.exception_handler(SelfExclusionNotAllowedError)
    async def handle_self_exclusion_not_allowed_error(
        request: Request, exc: SelfExclusionNotAllowedError
    ) -> JSONResponse:
        return JSONResponse(
            status_code=409,
            content={"detail": {"code": "self_exclusion_not_allowed", "message": str(exc)}},
        )

    @app.exception_handler(ExclusionConflictsError)
    async def handle_exclusion_conflicts_error(
        request: Request, exc: ExclusionConflictsError
    ) -> JSONResponse:
        return JSONResponse(
            status_code=409,
            content={
                "detail": {
                    "code": "exclusion_conflicts",
                    "message": str(exc),
                    "conflicts": exc.conflicts,
                }
            },
        )

    @app.exception_handler(ValidationError)
    async def handle_validation_error(request: Request, exc: ValidationError) -> JSONResponse:
        return JSONResponse(
            status_code=422,
            content={
                "detail": {"code": "validation_error", "message": str(exc) or "Validation failed"}
            },
        )

    @app.exception_handler(AuthorizationError)
    async def handle_authorization_error(request: Request, exc: AuthorizationError) -> JSONResponse:
        return JSONResponse(
            status_code=403,
            content={
                "detail": {"code": "authorization_error", "message": str(exc) or "Not authorized"}
            },
        )

    @app.exception_handler(ConflictError)
    async def handle_conflict_error(request: Request, exc: ConflictError) -> JSONResponse:
        return JSONResponse(
            status_code=409,
            content={
                "detail": {
                    "code": "conflict",
                    "message": str(exc) or "Operation conflicts with current state",
                }
            },
        )

    @app.exception_handler(DrawNotFoundError)
    async def handle_draw_not_found_error(request: Request, exc: DrawNotFoundError) -> JSONResponse:
        return JSONResponse(
            status_code=404,
            content={"detail": {"code": "draw_not_found", "message": str(exc) or "Draw not found"}},
        )

    @app.exception_handler(AssignmentsAlreadyExistError)
    async def handle_assignments_already_exist_error(
        request: Request, exc: AssignmentsAlreadyExistError
    ) -> JSONResponse:
        return JSONResponse(
            status_code=409,
            content={"detail": {"code": "assignments_already_exist", "message": str(exc)}},
        )

    @app.exception_handler(NoValidDrawConfigurationError)
    async def handle_no_valid_draw_configuration_error(
        request: Request, exc: NoValidDrawConfigurationError
    ) -> JSONResponse:
        return JSONResponse(
            status_code=400,
            content={"detail": {"code": "no_valid_draw_configuration", "message": str(exc)}},
        )

    @app.exception_handler(NoAssignmentsToFinalizeError)
    async def handle_no_assignments_to_finalize_error(
        request: Request, exc: NoAssignmentsToFinalizeError
    ) -> JSONResponse:
        return JSONResponse(
            status_code=400,
            content={"detail": {"code": "no_assignments_to_finalize", "message": str(exc)}},
        )

    @app.exception_handler(DrawNotFinalizedError)
    async def handle_draw_not_finalized_error(
        request: Request, exc: DrawNotFinalizedError
    ) -> JSONResponse:
        return JSONResponse(
            status_code=400,
            content={"detail": {"code": "draw_not_finalized", "message": str(exc)}},
        )

    @app.exception_handler(DrawImpossibleError)
    async def handle_draw_impossible_error(
        request: Request, exc: DrawImpossibleError
    ) -> JSONResponse:
        return JSONResponse(
            status_code=400,
            content={"detail": {"code": "draw_impossible", "message": str(exc)}},
        )
