from __future__ import annotations

from collections.abc import AsyncGenerator
from datetime import datetime
from typing import Annotated

from fastapi import APIRouter, Depends, HTTPException, Response
from pydantic import BaseModel, ConfigDict, EmailStr, Field, StringConstraints, ValidationError, model_validator
from sqlalchemy.ext.asyncio import AsyncSession

from gift_genie.application.dto.register_user_command import RegisterUserCommand
from gift_genie.application.errors import EmailConflictError
from gift_genie.application.use_cases.register_user import PasswordHasher, RegisterUserUseCase
from gift_genie.domain.interfaces.repositories import UserRepository
from gift_genie.infrastructure.database.session import get_async_session
from gift_genie.infrastructure.database.repositories.users import UserRepositorySqlAlchemy
from gift_genie.infrastructure.security.passwords import BcryptPasswordHasher

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


# Dependencies
async def get_user_repository(
    session: Annotated[AsyncSession, Depends(get_async_session)],
) -> AsyncGenerator[UserRepository, None]:
    yield UserRepositorySqlAlchemy(session)


async def get_password_hasher() -> PasswordHasher:
    return BcryptPasswordHasher()


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
    except EmailConflictError:
        raise HTTPException(status_code=409, detail={"code": "email_conflict"})
    except HTTPException:
        # Re-raise validation HTTPExceptions (e.g., weak password)
        raise
    except ValidationError as ve:
        # Pydantic validation errors (should be auto-handled by FastAPI, but keep for safety)
        raise HTTPException(status_code=400, detail={"code": "invalid_payload", "errors": ve.errors()})
    except Exception as e:
        print(e)
        breakpoint()
        # Avoid leaking details
        raise HTTPException(status_code=500, detail={"code": "server_error"})

    # Optionally set Location header
    _ = response.headers.setdefault("Location", f"/api/v1/users/{user.id}")

    return UserCreatedResponse(id=user.id, email=user.email, name=user.name, created_at=user.created_at)


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
