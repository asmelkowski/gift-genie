from __future__ import annotations

import secrets
from collections.abc import AsyncGenerator
from datetime import datetime
from typing import Annotated, Literal

from fastapi import APIRouter, Depends, HTTPException, Request, Response
from loguru import logger
from pydantic import (
    BaseModel,
    ConfigDict,
    EmailStr,
    Field,
    StringConstraints,
    model_validator,
)
from sqlalchemy.ext.asyncio import AsyncSession

from gift_genie.infrastructure.rate_limiting import limiter
from gift_genie.application.dto.get_current_user_query import GetCurrentUserQuery
from gift_genie.application.dto.login_command import LoginCommand
from gift_genie.application.dto.register_user_command import RegisterUserCommand
from gift_genie.application.use_cases.get_current_user import GetCurrentUserUseCase
from gift_genie.application.use_cases.login_user import LoginUserUseCase
from gift_genie.application.use_cases.register_user import RegisterUserUseCase
from gift_genie.domain.interfaces.security import PasswordHasher
from gift_genie.domain.interfaces.repositories import (
    UserRepository,
    UserPermissionRepository,
)
from gift_genie.infrastructure.database.session import get_async_session
from gift_genie.infrastructure.database.repositories.users import UserRepositorySqlAlchemy
from gift_genie.infrastructure.database.repositories.user_permissions import (
    UserPermissionRepositorySqlAlchemy,
)
from gift_genie.infrastructure.security.jwt import JWTService
from gift_genie.infrastructure.security.passwords import BcryptPasswordHasher
from gift_genie.infrastructure.config.settings import get_settings
from gift_genie.presentation.api.dependencies import get_current_user

router: APIRouter = APIRouter(prefix="/auth", tags=["auth"])


PasswordStr = Annotated[str, StringConstraints(min_length=8)]
NameStr = Annotated[str, StringConstraints(min_length=1, max_length=100, strip_whitespace=True)]


class RegisterRequest(BaseModel):
    model_config = ConfigDict(extra="forbid")

    email: EmailStr = Field(..., max_length=254)
    password: PasswordStr
    name: NameStr

    @model_validator(mode="after")
    def validate_strength(self) -> "RegisterRequest":
        email_local = self.email.split("@")[0].lower()
        name_norm = self.name.strip().lower()
        pwd = self.password

        if not _is_strong_password(pwd, email_local, name_norm):
            raise HTTPException(
                status_code=400,
                detail={"code": "invalid_payload", "field": "password", "message": "Weak password"},
            )
        return self


class UserCreatedResponse(BaseModel):
    id: str
    email: EmailStr
    name: str
    role: str
    created_at: datetime


class LoginRequest(BaseModel):
    model_config = ConfigDict(extra="forbid")

    email: EmailStr = Field(..., max_length=254)
    password: PasswordStr


class UserProfile(BaseModel):
    id: str
    email: str
    name: str
    role: str


class LoginResponse(BaseModel):
    user: UserProfile
    token_type: str = "Bearer"
    access_token: str


class UserProfileResponse(BaseModel):
    id: str
    email: str
    name: str
    role: str
    created_at: datetime
    updated_at: datetime


# Dependencies
async def get_user_repository(
    session: Annotated[AsyncSession, Depends(get_async_session)],
) -> AsyncGenerator[UserRepository, None]:
    yield UserRepositorySqlAlchemy(session)


async def get_user_permission_repository(
    session: Annotated[AsyncSession, Depends(get_async_session)],
) -> AsyncGenerator[UserPermissionRepository, None]:
    yield UserPermissionRepositorySqlAlchemy(session)


async def get_password_hasher() -> PasswordHasher:
    return BcryptPasswordHasher()


async def get_jwt_service() -> JWTService:
    settings = get_settings()
    return JWTService(settings.SECRET_KEY, settings.ALGORITHM)


@limiter.limit("5/minute")
@router.post("/register", response_model=UserCreatedResponse, status_code=201)
async def register_user(
    request: Request,
    payload: RegisterRequest,
    response: Response,
    user_repo: Annotated[UserRepository, Depends(get_user_repository)],
    user_perm_repo: Annotated[UserPermissionRepository, Depends(get_user_permission_repository)],
    password_hasher: Annotated[PasswordHasher, Depends(get_password_hasher)],
) -> UserCreatedResponse:
    cmd = RegisterUserCommand(
        email=str(payload.email).strip(), password=payload.password, name=payload.name
    )
    use_case = RegisterUserUseCase(
        user_repository=user_repo,
        password_hasher=password_hasher,
        user_permission_repository=user_perm_repo,
    )
    user = await use_case.execute(cmd)

    # Optionally set Location header
    _ = response.headers.setdefault("Location", f"/api/v1/users/{user.id}")

    return UserCreatedResponse(
        id=user.id, email=user.email, name=user.name, role=user.role, created_at=user.created_at
    )


@limiter.limit("5/minute")
@router.post("/login", response_model=LoginResponse)
async def login_user(
    request: Request,
    payload: LoginRequest,
    response: Response,
    user_repo: Annotated[UserRepository, Depends(get_user_repository)],
    password_hasher: Annotated[PasswordHasher, Depends(get_password_hasher)],
    jwt_service: Annotated[JWTService, Depends(get_jwt_service)],
) -> LoginResponse:
    cmd = LoginCommand(email=str(payload.email).strip(), password=payload.password)
    use_case = LoginUserUseCase(user_repository=user_repo, password_hasher=password_hasher)
    user = await use_case.execute(cmd)

    # Generate JWT
    access_token = jwt_service.create_access_token(data={"sub": user.id})

    # Set httpOnly cookie
    settings = get_settings()

    # Determine SameSite value based on environment
    # In dev/CI: SameSite=None allows cross-origin requests (required for frontend:5173 -> backend:8000)
    # In production: Use configured SameSite value (typically 'lax' for security)
    if settings.ENV == "dev":
        samesite_value = None
    else:
        samesite_value = _get_samesite_value(settings.COOKIE_SAMESITE)

    response.set_cookie(
        key="access_token",
        value=access_token,
        httponly=True,
        secure=settings.COOKIE_SECURE,
        samesite=samesite_value,
    )

    # Generate CSRF token
    csrf_token = secrets.token_urlsafe(32)

    # Set CSRF header
    response.headers["X-CSRF-Token"] = csrf_token

    return LoginResponse(
        user=UserProfile(id=user.id, email=user.email, name=user.name, role=user.role),
        access_token=access_token,
    )


@limiter.limit("100/minute")
@router.get("/me", response_model=UserProfileResponse)
async def get_current_user_profile(
    request: Request,
    current_user_id: Annotated[str, Depends(get_current_user)],
    user_repo: Annotated[UserRepository, Depends(get_user_repository)],
) -> UserProfileResponse:
    query = GetCurrentUserQuery(user_id=current_user_id)
    use_case = GetCurrentUserUseCase(user_repository=user_repo)
    user = await use_case.execute(query)

    return UserProfileResponse(
        id=user.id,
        email=user.email,
        name=user.name,
        role=user.role,
        created_at=user.created_at,
        updated_at=user.updated_at,
    )


@limiter.limit("10/minute")
@router.post("/logout", status_code=204)
async def logout(request: Request, response: Response) -> None:
    settings = get_settings()
    response.set_cookie(
        key="access_token",
        value="",
        max_age=0,
        httponly=True,
        secure=settings.COOKIE_SECURE,
        samesite=_get_samesite_value(settings.COOKIE_SAMESITE),
        path="/",
    )
    logger.info("User logged out successfully")


def _get_samesite_value(samesite_str: str) -> Literal["lax", "strict", "none"] | None:
    """Convert string samesite value to the literal type expected by FastAPI.

    Args:
        samesite_str: The samesite value from settings (case insensitive)

    Returns:
        The validated samesite literal or None if invalid

    Raises:
        ValueError: If the samesite value is not one of the allowed values
    """
    if not samesite_str:
        return None

    normalized = samesite_str.lower().strip()
    if normalized in ("lax", "strict", "none"):
        return normalized  # type: ignore[return-value]

    raise ValueError(f"Invalid samesite value: {samesite_str}. Must be 'lax', 'strict', or 'none'")


def _is_strong_password(pwd: str, email_local: str, name_norm: str) -> bool:
    # At least 3 of 4 classes
    has_lower = any(c.islower() for c in pwd)
    has_upper = any(c.isupper() for c in pwd)
    has_digit = any(c.isdigit() for c in pwd)
    has_symbol = any(not c.isalnum() for c in pwd)
    classes = sum([has_lower, has_upper, has_digit, has_symbol])
    if len(pwd) < 8 or classes < 3:
        return False

    p = pwd.lower()
    if email_local and email_local in p:
        return False
    if name_norm and name_norm in p:
        return False
    return True
