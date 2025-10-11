from __future__ import annotations

from typing import Any
from uuid import UUID

from sqlalchemy import func, select, delete
from sqlalchemy.exc import IntegrityError
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import aliased

from gift_genie.domain.entities.enums import ExclusionType
from gift_genie.domain.entities.exclusion import Exclusion
from gift_genie.domain.interfaces.repositories import ExclusionRepository
from gift_genie.infrastructure.database.models.exclusion import ExclusionModel
from gift_genie.infrastructure.database.models.member import MemberModel


class ExclusionRepositorySqlAlchemy(ExclusionRepository):
    def __init__(self, session: AsyncSession):
        self._session = session

    async def list_by_group(
        self,
        group_id: str,
        exclusion_type: ExclusionType | None,
        giver_member_id: str | None,
        receiver_member_id: str | None,
        page: int,
        page_size: int,
        sort: str
    ) -> tuple[list[Exclusion], int]:
        # Build base where clause
        base_where = ExclusionModel.group_id == UUID(group_id)
        if exclusion_type is not None:
            base_where &= ExclusionModel.exclusion_type == exclusion_type
        if giver_member_id:
            base_where &= ExclusionModel.giver_member_id == UUID(giver_member_id)
        if receiver_member_id:
            base_where &= ExclusionModel.receiver_member_id == UUID(receiver_member_id)

        # Get total count
        count_stmt = select(func.count()).select_from(ExclusionModel).where(base_where)
        count_res = await self._session.execute(count_stmt)
        total = count_res.scalar_one() or 0

        # Build query with joins for sorting by member names
        query = select(ExclusionModel).where(base_where)
        if "name" in sort:
            giver_member = aliased(MemberModel, name="giver_member")
            receiver_member = aliased(MemberModel, name="receiver_member")
            query = query.join(
                giver_member, ExclusionModel.giver_member_id == giver_member.id
            ).join(
                receiver_member, ExclusionModel.receiver_member_id == receiver_member.id
            )

        if "name" in sort:
            query = self._apply_sort(query, sort, giver_member)
        else:
            query = self._apply_sort(query, sort)
        query = query.limit(page_size).offset((page - 1) * page_size)

        # Execute and map
        res = await self._session.execute(query)
        models = res.scalars().all()
        exclusions = [self._to_domain(model) for model in models]

        return exclusions, total

    async def create(self, exclusion: Exclusion) -> Exclusion:
        model = ExclusionModel(
            id=UUID(exclusion.id),
            group_id=UUID(exclusion.group_id),
            giver_member_id=UUID(exclusion.giver_member_id),
            receiver_member_id=UUID(exclusion.receiver_member_id),
            exclusion_type=exclusion.exclusion_type,
            is_mutual=exclusion.is_mutual,
            created_at=exclusion.created_at,
            created_by_user_id=UUID(exclusion.created_by_user_id) if exclusion.created_by_user_id else None,
        )
        self._session.add(model)
        try:
            await self._session.flush()
            await self._session.commit()
        except IntegrityError as e:
            await self._session.rollback()
            raise ValueError("Failed to create exclusion") from e

        await self._session.refresh(model)
        return self._to_domain(model)

    async def create_many(self, exclusions: list[Exclusion]) -> list[Exclusion]:
        models = []
        for exclusion in exclusions:
            model = ExclusionModel(
                id=UUID(exclusion.id),
                group_id=UUID(exclusion.group_id),
                giver_member_id=UUID(exclusion.giver_member_id),
                receiver_member_id=UUID(exclusion.receiver_member_id),
                exclusion_type=exclusion.exclusion_type,
                is_mutual=exclusion.is_mutual,
                created_at=exclusion.created_at,
                created_by_user_id=UUID(exclusion.created_by_user_id) if exclusion.created_by_user_id else None,
            )
            models.append(model)

        self._session.add_all(models)
        try:
            await self._session.flush()
            await self._session.commit()
        except IntegrityError as e:
            await self._session.rollback()
            raise ValueError("Failed to create exclusions") from e

        # Refresh all models
        for model in models:
            await self._session.refresh(model)

        return [self._to_domain(model) for model in models]

    async def get_by_id(self, exclusion_id: str) -> Exclusion | None:
        stmt = select(ExclusionModel).where(ExclusionModel.id == UUID(exclusion_id))
        res = await self._session.execute(stmt)
        row = res.scalar_one_or_none()
        return self._to_domain(row) if row else None

    async def get_by_group_and_id(self, group_id: str, exclusion_id: str) -> Exclusion | None:
        stmt = select(ExclusionModel).where(
            ExclusionModel.id == UUID(exclusion_id),
            ExclusionModel.group_id == UUID(group_id)
        )
        res = await self._session.execute(stmt)
        row = res.scalar_one_or_none()
        return self._to_domain(row) if row else None

    async def exists_for_pair(self, group_id: str, giver_member_id: str, receiver_member_id: str) -> bool:
        # Check for direct exclusion
        stmt = select(func.count()).select_from(ExclusionModel).where(
            ExclusionModel.group_id == UUID(group_id),
            ExclusionModel.giver_member_id == UUID(giver_member_id),
            ExclusionModel.receiver_member_id == UUID(receiver_member_id)
        )
        res = await self._session.execute(stmt)
        direct_count = res.scalar_one() or 0

        if direct_count > 0:
            return True

        # Check for mutual exclusion (reverse direction)
        stmt = select(func.count()).select_from(ExclusionModel).where(
            ExclusionModel.group_id == UUID(group_id),
            ExclusionModel.giver_member_id == UUID(receiver_member_id),
            ExclusionModel.receiver_member_id == UUID(giver_member_id),
            ExclusionModel.is_mutual
        )
        res = await self._session.execute(stmt)
        mutual_count = res.scalar_one() or 0

        return mutual_count > 0

    async def check_conflicts_bulk(self, group_id: str, pairs: list[tuple[str, str]]) -> list[dict]:
        conflicts = []

        # Check for duplicates within the batch
        seen_pairs = set()
        for giver_id, receiver_id in pairs:
            pair = (giver_id, receiver_id)
            reverse_pair = (receiver_id, giver_id)
            if pair in seen_pairs or reverse_pair in seen_pairs:
                conflicts.append({
                    "giver_member_id": giver_id,
                    "receiver_member_id": receiver_id,
                    "reason": "duplicate_in_batch"
                })
            seen_pairs.add(pair)

        # Check for existing exclusions
        for giver_id, receiver_id in pairs:
            if await self.exists_for_pair(group_id, giver_id, receiver_id):
                conflicts.append({
                    "giver_member_id": giver_id,
                    "receiver_member_id": receiver_id,
                    "reason": "already_exists"
                })

        return conflicts

    async def delete(self, exclusion_id: str) -> None:
        stmt = delete(ExclusionModel).where(ExclusionModel.id == UUID(exclusion_id))
        await self._session.execute(stmt)
        try:
            await self._session.commit()
        except IntegrityError as e:
            await self._session.rollback()
            raise ValueError("Failed to delete exclusion") from e

    def _apply_sort(self, query, sort: str, member_alias=None):
        # Parse sort string like "exclusion_type,name" or "-created_at"
        sort_fields = sort.split(",")
        order_by_clauses = []

        for field in sort_fields:
            if field.startswith("-"):
                field_name = field[1:]
                desc = True
            else:
                field_name = field
                desc = False

            col: Any
            if field_name == "exclusion_type":
                col = ExclusionModel.exclusion_type
            elif field_name == "created_at":
                col = ExclusionModel.created_at
            elif field_name == "name":
                # For name sorting, we need to decide on giver or receiver name
                # Let's use giver name for simplicity
                if member_alias:
                    col = member_alias.name
                else:
                    col = MemberModel.name
            else:
                raise ValueError(f"Invalid sort field: {field_name}")

            if desc:
                order_by_clauses.append(col.desc())
            else:
                order_by_clauses.append(col.asc())

        return query.order_by(*order_by_clauses)

    def _to_domain(self, model: ExclusionModel) -> Exclusion:
        return Exclusion(
            id=str(model.id),
            group_id=str(model.group_id),
            giver_member_id=str(model.giver_member_id),
            receiver_member_id=str(model.receiver_member_id),
            exclusion_type=model.exclusion_type,
            is_mutual=model.is_mutual,
            created_at=model.created_at,
            created_by_user_id=str(model.created_by_user_id) if model.created_by_user_id else None,
        )
