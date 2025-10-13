from __future__ import annotations

from uuid import UUID

from sqlalchemy import func, select
from sqlalchemy.exc import IntegrityError
from sqlalchemy.ext.asyncio import AsyncSession

from gift_genie.domain.entities.assignment import Assignment
from gift_genie.domain.entities.enums import DrawStatus
from gift_genie.domain.interfaces.repositories import AssignmentRepository
from gift_genie.infrastructure.database.models.assignment import AssignmentModel
from gift_genie.infrastructure.database.models.draw import DrawModel


class AssignmentRepositorySqlAlchemy(AssignmentRepository):
    def __init__(self, session: AsyncSession):
        self._session = session

    async def create_many(self, assignments: list[Assignment]) -> list[Assignment]:
        models = []
        for assignment in assignments:
            model = AssignmentModel(
                id=UUID(assignment.id),
                draw_id=UUID(assignment.draw_id),
                giver_member_id=UUID(assignment.giver_member_id),
                receiver_member_id=UUID(assignment.receiver_member_id),
                encrypted_receiver_id=assignment.encrypted_receiver_id,
                created_at=assignment.created_at,
            )
            models.append(model)

        self._session.add_all(models)
        try:
            await self._session.flush()
            await self._session.commit()
        except IntegrityError as e:
            await self._session.rollback()
            raise ValueError("Failed to create assignments") from e

        # Refresh all models
        for model in models:
            await self._session.refresh(model)

        return [self._to_domain(model) for model in models]

    async def list_by_draw(self, draw_id: str) -> list[Assignment]:
        stmt = select(AssignmentModel).where(AssignmentModel.draw_id == UUID(draw_id))
        res = await self._session.execute(stmt)
        models = res.scalars().all()
        return [self._to_domain(model) for model in models]

    async def count_by_draw(self, draw_id: str) -> int:
        stmt = select(func.count()).select_from(AssignmentModel).where(AssignmentModel.draw_id == UUID(draw_id))
        res = await self._session.execute(stmt)
        return res.scalar_one() or 0

    async def get_historical_exclusions(
        self,
        group_id: str,
        lookback_count: int
    ) -> list[tuple[str, str]]:
        # Get the most recent finalized draws for the group, limited by lookback_count
        subquery = (
            select(DrawModel.id)
            .where(
                DrawModel.group_id == UUID(group_id),
                DrawModel.status == DrawStatus.FINALIZED
            )
            .order_by(DrawModel.finalized_at.desc())
            .limit(lookback_count)
        )

        # Get assignments from those draws
        stmt = select(AssignmentModel.giver_member_id, AssignmentModel.receiver_member_id).where(
            AssignmentModel.draw_id.in_(subquery)
        )

        res = await self._session.execute(stmt)
        rows = res.all()

        # Convert UUIDs to strings
        return [(str(row[0]), str(row[1])) for row in rows]

    def _to_domain(self, model: AssignmentModel) -> Assignment:
        return Assignment(
            id=str(model.id),
            draw_id=str(model.draw_id),
            giver_member_id=str(model.giver_member_id),
            receiver_member_id=str(model.receiver_member_id),
            encrypted_receiver_id=model.encrypted_receiver_id,
            created_at=model.created_at,
        )