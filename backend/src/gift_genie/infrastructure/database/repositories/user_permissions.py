from __future__ import annotations

from uuid import UUID

from sqlalchemy import and_, select
from sqlalchemy.exc import IntegrityError
from sqlalchemy.ext.asyncio import AsyncSession

from gift_genie.domain.entities.permission import Permission
from gift_genie.domain.entities.user_permission import UserPermission
from gift_genie.domain.interfaces.repositories import UserPermissionRepository
from gift_genie.infrastructure.database.models.permission import PermissionModel
from gift_genie.infrastructure.database.models.user_permission import UserPermissionModel


class UserPermissionRepositorySqlAlchemy(UserPermissionRepository):
    """SQLAlchemy implementation of the UserPermissionRepository interface."""

    def __init__(self, session: AsyncSession):
        self._session = session

    async def grant_permission(
        self, user_id: str, permission_code: str, granted_by: str | None
    ) -> UserPermission:
        """Grant a single permission to a user.

        This method is idempotent: if the permission is already granted, it
        returns the existing grant without error.
        """
        # Check if permission already granted - if so, return existing grant
        existing = await self.list_by_user(user_id)
        for perm in existing:
            if perm.permission_code == permission_code:
                return perm

        # Permission not yet granted, so grant it
        results = await self.grant_permissions_bulk(user_id, [permission_code], granted_by)
        return results[0]

    async def grant_permissions_bulk(
        self, user_id: str, permission_codes: list[str], granted_by: str | None
    ) -> list[UserPermission]:
        """Grant multiple permissions to a user in a single operation."""
        models = [
            UserPermissionModel(
                user_id=UUID(user_id),
                permission_code=code,
                granted_by=UUID(granted_by) if granted_by else None,
            )
            for code in permission_codes
        ]
        self._session.add_all(models)
        try:
            await self._session.flush()
            await self._session.commit()
        except IntegrityError as e:
            await self._session.rollback()
            raise ValueError(f"Failed to grant permissions to user {user_id}") from e

        # Refresh and convert
        results = []
        for model in models:
            await self._session.refresh(model)
            domain = self._to_domain(model)
            if domain:
                results.append(domain)
        return results

    async def revoke_permission(self, user_id: str, permission_code: str) -> bool:
        """Revoke a permission from a user."""
        stmt = select(UserPermissionModel).where(
            and_(
                UserPermissionModel.user_id == UUID(user_id),
                UserPermissionModel.permission_code == permission_code,
            )
        )
        res = await self._session.execute(stmt)
        model = res.scalar_one_or_none()

        if not model:
            return False

        await self._session.delete(model)
        await self._session.commit()
        return True

    async def has_permission(self, user_id: str, permission_code: str) -> bool:
        """Check if a user has a specific permission."""
        stmt = select(UserPermissionModel).where(
            and_(
                UserPermissionModel.user_id == UUID(user_id),
                UserPermissionModel.permission_code == permission_code,
            )
        )
        res = await self._session.execute(stmt)
        return res.scalar_one_or_none() is not None

    async def list_by_user(self, user_id: str) -> list[UserPermission]:
        """List all permissions granted to a user."""
        stmt = select(UserPermissionModel).where(UserPermissionModel.user_id == UUID(user_id))
        res = await self._session.execute(stmt)
        models = res.scalars().all()
        return [up for model in models if (up := self._to_domain(model)) is not None]

    async def list_permissions_for_user(self, user_id: str) -> list[Permission]:
        """List all Permission entities granted to a user.

        Handles both base permissions and resource-scoped permissions (e.g., groups:read:UUID).
        For base permissions, returns the Permission from the database.
        For resource-scoped permissions, synthesizes a Permission entity from the base permission.
        """
        # 1. Get all user permission grants
        user_perm_stmt = select(UserPermissionModel).where(
            UserPermissionModel.user_id == UUID(user_id)
        )
        user_perm_res = await self._session.execute(user_perm_stmt)
        user_perm_models = user_perm_res.scalars().all()

        # 2. For each permission, resolve base permission and synthesize if needed
        permissions = []
        for user_perm in user_perm_models:
            perm_code = user_perm.permission_code

            # Try direct lookup first (for non-scoped permissions)
            perm_stmt = select(PermissionModel).where(PermissionModel.code == perm_code)
            perm_res = await self._session.execute(perm_stmt)
            perm_model = perm_res.scalar_one_or_none()

            if perm_model:
                # Found direct match - use it as-is
                permission = self._permission_to_domain(perm_model)
                if permission:
                    permissions.append(permission)
            else:
                # Resource-scoped permission - synthesize from base
                base_code = self._extract_base_permission(perm_code)
                base_perm_stmt = select(PermissionModel).where(PermissionModel.code == base_code)
                base_perm_res = await self._session.execute(base_perm_stmt)
                base_perm_model = base_perm_res.scalar_one_or_none()

                if base_perm_model:
                    # Create synthetic permission with full code
                    synthetic = Permission(
                        code=perm_code,  # Full code with resource ID
                        name=base_perm_model.name,
                        description=base_perm_model.description,
                        category=base_perm_model.category,
                        created_at=base_perm_model.created_at,
                    )
                    permissions.append(synthetic)

        return permissions

    @staticmethod
    def _extract_base_permission(permission_code: str) -> str:
        """Extract base permission from resource-scoped code.

        For resource-scoped permissions like 'groups:read:UUID', returns 'groups:read'.
        For base permissions, returns the code unchanged.
        """
        parts = permission_code.split(":")
        if len(parts) >= 3:
            return f"{parts[0]}:{parts[1]}"
        return permission_code

    @staticmethod
    def _to_domain(model: UserPermissionModel | None) -> UserPermission | None:
        """Convert database model to domain entity."""
        if not model:
            return None
        return UserPermission(
            user_id=str(model.user_id),
            permission_code=model.permission_code,
            granted_at=model.granted_at,
            granted_by=str(model.granted_by) if model.granted_by else None,
        )

    @staticmethod
    def _permission_to_domain(model: PermissionModel | None) -> Permission | None:
        """Convert permission database model to domain entity."""
        if not model:
            return None
        return Permission(
            code=model.code,
            name=model.name,
            description=model.description,
            category=model.category,
            created_at=model.created_at,
        )
