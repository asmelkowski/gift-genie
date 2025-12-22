"""Test-only endpoints for E2E testing support.

These endpoints are ONLY available in non-production environments and provide
utilities for E2E tests to manage test data, such as:
- Creating users with specific roles for testing permission scenarios
- Deleting test data by pattern to clean up after tests

All endpoints are prefixed with /api/v1/test/ and are protected by the
TestGuardMiddleware which returns 404 in production.
"""

from __future__ import annotations

from collections.abc import AsyncGenerator
from typing import Annotated, Literal
from uuid import uuid4

from fastapi import APIRouter, Depends, HTTPException
from loguru import logger
from pydantic import BaseModel, ConfigDict, EmailStr, Field, StringConstraints
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from gift_genie.domain.entities.enums import UserRole
from gift_genie.domain.entities.user import User
from gift_genie.domain.interfaces.repositories import (
    UserRepository,
)
from gift_genie.domain.interfaces.security import PasswordHasher
from gift_genie.infrastructure.database.session import get_async_session
from gift_genie.infrastructure.database.repositories.users import UserRepositorySqlAlchemy
from gift_genie.infrastructure.security.jwt import JWTService
from gift_genie.infrastructure.security.passwords import BcryptPasswordHasher
from gift_genie.infrastructure.config.settings import get_settings
from gift_genie.libs.utils import utc_datetime_now

router: APIRouter = APIRouter(prefix="/test", tags=["test"])

PasswordStr = Annotated[str, StringConstraints(min_length=8)]
NameStr = Annotated[str, StringConstraints(min_length=1, max_length=100, strip_whitespace=True)]


# =====================
# Pydantic Models
# =====================


class CreateTestUserRequest(BaseModel):
    """Request to create a test user with a specific role."""

    model_config = ConfigDict(extra="forbid")

    name: NameStr
    email: EmailStr = Field(..., max_length=254)
    password: PasswordStr
    role: Literal["admin", "user"] = Field(default="user")


class CreateTestUserResponse(BaseModel):
    """Response after creating a test user."""

    id: str
    name: str
    email: str
    role: str
    access_token: str


class DeleteTestUsersRequest(BaseModel):
    """Request to delete test users by email pattern."""

    model_config = ConfigDict(extra="forbid")

    email_pattern: str = Field(..., min_length=1)


class DeleteTestUsersResponse(BaseModel):
    """Response after deleting test users."""

    deleted_count: int


# =====================
# Dependencies
# =====================


async def get_user_repository(
    session: Annotated[AsyncSession, Depends(get_async_session)],
) -> AsyncGenerator[UserRepository, None]:
    """Dependency to provide UserRepository."""
    yield UserRepositorySqlAlchemy(session)


async def get_password_hasher() -> PasswordHasher:
    """Dependency to provide password hasher."""
    return BcryptPasswordHasher()


async def get_jwt_service() -> JWTService:
    """Dependency to provide JWT service."""
    settings = get_settings()
    return JWTService(settings.SECRET_KEY, settings.ALGORITHM)


# =====================
# Endpoints
# =====================


@router.post("/users", response_model=CreateTestUserResponse, status_code=201)
async def create_test_user(
    payload: CreateTestUserRequest,
    user_repo: Annotated[UserRepository, Depends(get_user_repository)],
    password_hasher: Annotated[PasswordHasher, Depends(get_password_hasher)],
    jwt_service: Annotated[JWTService, Depends(get_jwt_service)],
) -> CreateTestUserResponse:
    """Create a test user with a specified role.

    This endpoint is useful for E2E tests that need to create users with
    specific roles (e.g., admin users) to test permission scenarios.

    In the resource-level permissions system, users start with no global permissions.
    They receive permissions automatically when they create groups.

    Args:
        payload: The test user creation request
        user_repo: The user repository
        password_hasher: The password hasher
        jwt_service: The JWT service for token generation

    Returns:
        The created user with an access token for immediate use

    Raises:
        HTTPException: If email already exists (409)
    """
    # Hash the password
    password_hash = await password_hasher.hash(payload.password)

    # Create the user entity
    now = utc_datetime_now()
    user = User(
        id=str(uuid4()),
        email=payload.email,
        password_hash=password_hash,
        name=payload.name,
        role=UserRole(payload.role),
        created_at=now,
        updated_at=now,
    )

    # Save to database
    try:
        created_user = await user_repo.create(user)
    except Exception as e:
        logger.error(f"Failed to create test user: {e}")
        raise HTTPException(
            status_code=409,
            detail={"code": "email_conflict", "message": "Email already exists"},
        )

    # Generate access token
    access_token = jwt_service.create_access_token(data={"sub": created_user.id})

    logger.info(
        "Test user created",
        extra={
            "user_id": created_user.id,
            "email": created_user.email,
            "role": created_user.role,
        },
    )

    return CreateTestUserResponse(
        id=created_user.id,
        name=created_user.name,
        email=created_user.email,
        role=created_user.role.value,
        access_token=access_token,
    )


@router.delete("/users", response_model=DeleteTestUsersResponse)
async def delete_test_users(
    payload: DeleteTestUsersRequest,
    session: Annotated[AsyncSession, Depends(get_async_session)],
) -> DeleteTestUsersResponse:
    """Delete test users by email pattern.

    This endpoint allows E2E tests to clean up test data. Uses SQL LIKE
    pattern matching for flexible deletion (e.g., "e2e-test-%").

    Args:
        payload: The deletion request with email pattern
        session: The database session

    Returns:
        The count of deleted users

    Raises:
        HTTPException: If pattern is invalid (400)
    """
    # Validate pattern - require at least some prefix to avoid mass deletion
    pattern = payload.email_pattern.strip()

    if not pattern or len(pattern) < 2:
        raise HTTPException(
            status_code=400,
            detail={
                "code": "invalid_pattern",
                "message": "Email pattern must be at least 2 characters",
            },
        )

    # Use SQL LIKE for pattern matching
    # Note: We're importing the UserModel here to access the table
    from gift_genie.infrastructure.database.models.user import UserModel

    # Count how many users will be deleted
    count_stmt = select(func.count()).select_from(UserModel).where(UserModel.email.like(pattern))
    count_result = await session.execute(count_stmt)
    deleted_count = count_result.scalar_one() or 0

    # Delete matching users
    delete_stmt = select(UserModel).where(UserModel.email.like(pattern))
    result = await session.execute(delete_stmt)
    users_to_delete = result.scalars().all()

    for user in users_to_delete:
        await session.delete(user)

    await session.commit()

    logger.info(
        "Test users deleted",
        extra={
            "pattern": pattern,
            "deleted_count": deleted_count,
        },
    )

    return DeleteTestUsersResponse(deleted_count=deleted_count)
