from __future__ import annotations

import secrets
from collections.abc import AsyncGenerator
from datetime import datetime
from typing import Annotated

from fastapi import APIRouter, Depends, HTTPException, Request, Response
from loguru import logger
from pydantic import BaseModel, ConfigDict, EmailStr, Field, StringConstraints, ValidationError, model_validator
from sqlalchemy.ext.asyncio import AsyncSession

from gift_genie.application.dto.get_current_user_query import GetCurrentUserQuery
from gift_genie.application.dto.login_command import LoginCommand
from gift_genie.application.dto.register_user_command import RegisterUserCommand
from gift_genie.application.errors import EmailConflictError, InvalidCredentialsError
from gift_genie.application.use_cases.get_current_user import GetCurrentUserUseCase
from gift_genie.application.use_cases.login_user import LoginUserUseCase
from gift_genie.application.use_cases.register_user import RegisterUserUseCase
from gift_genie.domain.interfaces.security import PasswordHasher
from gift_genie.domain.interfaces.repositories import UserRepository
from gift_genie.infrastructure.database.session import get_async_session
from gift_genie.infrastructure.database.repositories.users import UserRepositorySqlAlchemy
from gift_genie.infrastructure.security.jwt import JWTService
from gift_genie.infrastructure.security.passwords import BcryptPasswordHasher
from gift_genie.infrastructure.config.settings import get_settings

router = APIRouter(prefix="/auth", tags=["auth"])


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
    created_at: datetime


class LoginRequest(BaseModel):
    model_config = ConfigDict(extra="forbid")

    email: EmailStr = Field(..., max_length=254)
    password: PasswordStr


class UserProfile(BaseModel):
    id: str
    email: str
    name: str


class LoginResponse(BaseModel):
    user: UserProfile
    token_type: str = "Bearer"


class UserProfileResponse(BaseModel):
    id: str
    email: str
    name: str
    created_at: datetime
    updated_at: datetime


# Dependencies
async def get_user_repository(
    session: Annotated[AsyncSession, Depends(get_async_session)],
) -> AsyncGenerator[UserRepository, None]:
    yield UserRepositorySqlAlchemy(session)


async def get_password_hasher() -> PasswordHasher:
    return BcryptPasswordHasher()


async def get_jwt_service() -> JWTService:
    settings = get_settings()
    return JWTService(settings.SECRET_KEY, settings.ALGORITHM)


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


@router.post("/register", response_model=UserCreatedResponse, status_code=201)
async def register_user(
    payload: RegisterRequest,
    response: Response,
    user_repo: Annotated[UserRepository, Depends(get_user_repository)],
    password_hasher: Annotated[PasswordHasher, Depends(get_password_hasher)],
) -> UserCreatedResponse:
    try:
        cmd = RegisterUserCommand(email=str(payload.email).strip(), password=payload.password, name=payload.name)
        use_case = RegisterUserUseCase(user_repository=user_repo, password_hasher=password_hasher)
        user = await use_case.execute(cmd)
    except EmailConflictError as e:
        logger.warning("Email conflict during registration", email=payload.email, error=str(e))
        raise HTTPException(status_code=409, detail={"code": "email_conflict"})
    except HTTPException:
        # Re-raise validation HTTPExceptions (e.g., weak password)
        raise
    except ValidationError as ve:
        # Pydantic validation errors (should be auto-handled by FastAPI, but keep for safety)
        logger.warning("Validation error during registration", email=payload.email, errors=ve.errors())
        raise HTTPException(status_code=400, detail={"code": "invalid_payload", "errors": ve.errors()})
    except Exception as e:
        # Avoid leaking details
        logger.exception("Unexpected error during user registration", email=payload.email, error=str(e))
        raise HTTPException(status_code=500, detail={"code": "server_error"})

    # Optionally set Location header
    _ = response.headers.setdefault("Location", f"/api/v1/users/{user.id}")

    return UserCreatedResponse(id=user.id, email=user.email, name=user.name, created_at=user.created_at)


@router.post("/login", response_model=LoginResponse)
async def login_user(
    payload: LoginRequest,
    response: Response,
    user_repo: Annotated[UserRepository, Depends(get_user_repository)],
    password_hasher: Annotated[PasswordHasher, Depends(get_password_hasher)],
    jwt_service: Annotated[JWTService, Depends(get_jwt_service)],
) -> LoginResponse:
    try:
        cmd = LoginCommand(email=str(payload.email).strip(), password=payload.password)
        use_case = LoginUserUseCase(user_repository=user_repo, password_hasher=password_hasher)
        user = await use_case.execute(cmd)
    except InvalidCredentialsError as e:
        logger.warning("Invalid credentials during login", email=payload.email, error=str(e))
        raise HTTPException(status_code=401, detail={"code": "invalid_credentials"})
    except HTTPException:
        raise
    except ValidationError as ve:
        logger.warning("Validation error during login", email=payload.email, errors=ve.errors())
        raise HTTPException(status_code=400, detail={"code": "invalid_payload", "errors": ve.errors()})
    except Exception as e:
        # Avoid leaking details
        logger.exception("Unexpected error during user login", email=payload.email, error=str(e))
        raise HTTPException(status_code=500, detail={"code": "server_error"})

    # Generate JWT
    access_token = jwt_service.create_access_token(data={"sub": user.id})

    # Set httpOnly cookie
    response.set_cookie(
        key="access_token",
        value=access_token,
        httponly=True,
        secure=False,  # Set to True in production with HTTPS
        samesite="lax",
    )

    # Generate CSRF token
    csrf_token = secrets.token_urlsafe(32)

    # Set CSRF header
    response.headers["X-CSRF-Token"] = csrf_token

    return LoginResponse(user=UserProfile(id=user.id, email=user.email, name=user.name))


@router.get("/me", response_model=UserProfileResponse)
async def get_current_user_profile(
    current_user_id: Annotated[str, Depends(get_current_user)],
    user_repo: Annotated[UserRepository, Depends(get_user_repository)],
) -> UserProfileResponse:
    try:
        query = GetCurrentUserQuery(user_id=current_user_id)
        use_case = GetCurrentUserUseCase(user_repository=user_repo)
        user = await use_case.execute(query)
    except InvalidCredentialsError as e:
        logger.warning("User not found during profile retrieval", user_id=current_user_id, error=str(e))
        raise HTTPException(status_code=401, detail={"code": "unauthorized"})
    except Exception as e:
        logger.exception("Unexpected error during get current user profile", user_id=current_user_id, error=str(e))
        raise HTTPException(status_code=500, detail={"code": "server_error"})

    return UserProfileResponse(
        id=user.id,
        email=user.email,
        name=user.name,
        created_at=user.created_at,
        updated_at=user.updated_at,
    )
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
