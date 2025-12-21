import pytest
from unittest.mock import AsyncMock, Mock
from uuid import uuid4
from datetime import UTC, datetime

from gift_genie.application.dto.create_draw_command import CreateDrawCommand
from gift_genie.application.dto.delete_draw_command import DeleteDrawCommand
from gift_genie.application.dto.execute_draw_command import ExecuteDrawCommand
from gift_genie.application.dto.finalize_draw_command import FinalizeDrawCommand
from gift_genie.application.dto.get_draw_query import GetDrawQuery
from gift_genie.application.dto.list_draws_query import ListDrawsQuery
from gift_genie.application.dto.notify_draw_command import NotifyDrawCommand
from gift_genie.application.errors import (
    CannotDeleteFinalizedDrawError,
    DrawAlreadyFinalizedError,
    DrawNotFoundError,
    ForbiddenError,
    GroupNotFoundError,
    NoValidDrawConfigurationError,
)
from gift_genie.application.use_cases.create_draw import CreateDrawUseCase
from gift_genie.application.use_cases.delete_draw import DeleteDrawUseCase
from gift_genie.application.use_cases.execute_draw import ExecuteDrawUseCase
from gift_genie.application.use_cases.finalize_draw import FinalizeDrawUseCase
from gift_genie.application.use_cases.get_draw import GetDrawUseCase
from gift_genie.application.use_cases.list_draws import ListDrawsUseCase
from gift_genie.application.use_cases.notify_draw import NotifyDrawUseCase
from gift_genie.domain.entities.assignment import Assignment
from gift_genie.domain.entities.draw import Draw
from gift_genie.domain.entities.enums import DrawStatus
from gift_genie.domain.entities.group import Group
from gift_genie.domain.entities.member import Member


@pytest.mark.anyio
async def test_create_draw_success():
    # Mock repositories
    group_repo = AsyncMock()
    draw_repo = AsyncMock()

    # Setup test data
    group_id = str(uuid4())
    user_id = str(uuid4())

    group = Group(
        id=group_id,
        admin_user_id=user_id,
        name="Test Group",
        historical_exclusions_enabled=True,
        historical_exclusions_lookback=1,
        created_at=None,
        updated_at=None,
    )
    group_repo.get_by_id.return_value = group

    created_draw = Draw(
        id=str(uuid4()),
        group_id=group_id,
        status=DrawStatus.PENDING,
        created_at=datetime.now(tz=UTC),
        finalized_at=None,
        notification_sent_at=None,
    )
    draw_repo.create.return_value = created_draw

    # Execute use case
    use_case = CreateDrawUseCase(
        group_repository=group_repo,
        draw_repository=draw_repo,
    )
    command = CreateDrawCommand(
        group_id=group_id,
        requesting_user_id=user_id,
    )

    result = await use_case.execute(command)

    assert result.id == created_draw.id
    assert result.group_id == group_id
    assert result.status == DrawStatus.PENDING
    assert result.finalized_at is None
    assert result.notification_sent_at is None


@pytest.mark.anyio
async def test_create_draw_group_not_found():
    group_repo = AsyncMock()
    draw_repo = AsyncMock()

    group_repo.get_by_id.return_value = None

    use_case = CreateDrawUseCase(
        group_repository=group_repo,
        draw_repository=draw_repo,
    )
    command = CreateDrawCommand(
        group_id=str(uuid4()),
        requesting_user_id=str(uuid4()),
    )

    with pytest.raises(GroupNotFoundError):
        await use_case.execute(command)


@pytest.mark.anyio
async def test_create_draw_forbidden_not_owner():
    group_repo = AsyncMock()
    draw_repo = AsyncMock()

    group_id = str(uuid4())
    admin_id = str(uuid4())
    user_id = str(uuid4())
    group = Group(
        id=group_id,
        admin_user_id=admin_id,  # Different owner
        name="Test Group",
        historical_exclusions_enabled=True,
        historical_exclusions_lookback=1,
        created_at=None,
        updated_at=None,
    )
    group_repo.get_by_id.return_value = group

    use_case = CreateDrawUseCase(
        group_repository=group_repo,
        draw_repository=draw_repo,
    )
    command = CreateDrawCommand(
        group_id=group_id,
        requesting_user_id=user_id,  # Not owner
    )

    with pytest.raises(ForbiddenError):
        await use_case.execute(command)


@pytest.mark.anyio
async def test_delete_draw_success():
    # Mock repositories
    group_repo = AsyncMock()
    draw_repo = AsyncMock()

    # Setup test data
    group_id = str(uuid4())
    user_id = str(uuid4())
    draw_id = str(uuid4())

    group = Group(
        id=group_id,
        admin_user_id=user_id,
        name="Test Group",
        historical_exclusions_enabled=True,
        historical_exclusions_lookback=1,
        created_at=None,
        updated_at=None,
    )
    group_repo.get_by_id.return_value = group

    draw = Draw(
        id=draw_id,
        group_id=group_id,
        status=DrawStatus.PENDING,
        created_at=datetime.now(tz=UTC),
        finalized_at=None,
        notification_sent_at=None,
    )
    draw_repo.get_by_id.return_value = draw

    # Execute use case
    use_case = DeleteDrawUseCase(
        group_repository=group_repo,
        draw_repository=draw_repo,
    )
    command = DeleteDrawCommand(
        draw_id=draw_id,
        requesting_user_id=user_id,
    )

    await use_case.execute(command)

    draw_repo.delete.assert_called_once_with(draw_id)


@pytest.mark.anyio
async def test_delete_draw_not_found():
    group_repo = AsyncMock()
    draw_repo = AsyncMock()

    draw_repo.get_by_id.return_value = None

    use_case = DeleteDrawUseCase(
        group_repository=group_repo,
        draw_repository=draw_repo,
    )
    command = DeleteDrawCommand(
        draw_id=str(uuid4()),
        requesting_user_id=str(uuid4()),
    )

    with pytest.raises(DrawNotFoundError):
        await use_case.execute(command)


@pytest.mark.anyio
async def test_delete_draw_already_finalized():
    group_repo = AsyncMock()
    draw_repo = AsyncMock()

    group_id = str(uuid4())
    user_id = str(uuid4())
    draw_id = str(uuid4())

    group = Group(
        id=group_id,
        admin_user_id=user_id,
        name="Test Group",
        historical_exclusions_enabled=True,
        historical_exclusions_lookback=1,
        created_at=None,
        updated_at=None,
    )
    group_repo.get_by_id.return_value = group

    draw = Draw(
        id=draw_id,
        group_id=group_id,
        status=DrawStatus.FINALIZED,  # Already finalized
        created_at=datetime.now(tz=UTC),
        finalized_at=datetime.now(tz=UTC),
        notification_sent_at=None,
    )
    draw_repo.get_by_id.return_value = draw

    use_case = DeleteDrawUseCase(
        group_repository=group_repo,
        draw_repository=draw_repo,
    )
    command = DeleteDrawCommand(
        draw_id=draw_id,
        requesting_user_id=user_id,
    )

    with pytest.raises(CannotDeleteFinalizedDrawError):
        await use_case.execute(command)


@pytest.mark.anyio
async def test_execute_draw_success():
    # Mock repositories and services
    group_repo = AsyncMock()
    draw_repo = AsyncMock()
    member_repo = AsyncMock()
    exclusion_repo = AsyncMock()
    assignment_repo = AsyncMock()
    draw_algorithm = Mock()

    # Setup test data
    group_id = str(uuid4())
    user_id = str(uuid4())
    draw_id = str(uuid4())
    member_ids = [str(uuid4()), str(uuid4()), str(uuid4())]

    group = Group(
        id=group_id,
        admin_user_id=user_id,
        name="Test Group",
        historical_exclusions_enabled=True,
        historical_exclusions_lookback=1,
        created_at=None,
        updated_at=None,
    )
    group_repo.get_by_id.return_value = group

    draw = Draw(
        id=draw_id,
        group_id=group_id,
        status=DrawStatus.PENDING,
        created_at=datetime.now(tz=UTC),
        finalized_at=None,
        notification_sent_at=None,
    )
    draw_repo.get_by_id.return_value = draw

    members = [
        Member(
            id=mid,
            group_id=group_id,
            name=f"Member {i}",
            email=f"member{i}@example.com",
            is_active=True,
            created_at=None,
        )
        for i, mid in enumerate(member_ids)
    ]
    member_repo.list_by_group.return_value = (members, len(members))

    exclusion_repo.list_by_group.return_value = ([], 0)

    assignments = [
        Assignment(
            id=str(uuid4()),
            draw_id=draw_id,
            giver_member_id=member_ids[0],
            receiver_member_id=member_ids[1],
            encrypted_receiver_id=None,
            created_at=datetime.now(tz=UTC),
        ),
        Assignment(
            id=str(uuid4()),
            draw_id=draw_id,
            giver_member_id=member_ids[1],
            receiver_member_id=member_ids[2],
            encrypted_receiver_id=None,
            created_at=datetime.now(tz=UTC),
        ),
        Assignment(
            id=str(uuid4()),
            draw_id=draw_id,
            giver_member_id=member_ids[2],
            receiver_member_id=member_ids[0],
            encrypted_receiver_id=None,
            created_at=datetime.now(tz=UTC),
        ),
    ]
    draw_algorithm.generate_assignments.return_value = {
        member_ids[0]: member_ids[1],
        member_ids[1]: member_ids[2],
        member_ids[2]: member_ids[0],
    }
    assignment_repo.create_many.return_value = assignments
    assignment_repo.count_by_draw = AsyncMock(return_value=0)

    # Execute use case
    use_case = ExecuteDrawUseCase(
        group_repository=group_repo,
        draw_repository=draw_repo,
        member_repository=member_repo,
        exclusion_repository=exclusion_repo,
        assignment_repository=assignment_repo,
        draw_algorithm=draw_algorithm,
    )
    command = ExecuteDrawCommand(
        draw_id=draw_id,
        requesting_user_id=user_id,
    )

    result = await use_case.execute(command)

    draw, assignments = result
    assert len(assignments) == 3
    assert all(isinstance(a, Assignment) for a in assignments)
    assignment_repo.create_many.assert_called_once()


@pytest.mark.anyio
async def test_execute_draw_insufficient_members():
    group_repo = AsyncMock()
    draw_repo = AsyncMock()
    member_repo = AsyncMock()
    exclusion_repo = AsyncMock()
    assignment_repo = AsyncMock()
    draw_algorithm = AsyncMock()

    group_id = str(uuid4())
    user_id = str(uuid4())
    draw_id = str(uuid4())

    group = Group(
        id=group_id,
        admin_user_id=user_id,
        name="Test Group",
        historical_exclusions_enabled=True,
        historical_exclusions_lookback=1,
        created_at=None,
        updated_at=None,
    )
    group_repo.get_by_id.return_value = group

    draw = Draw(
        id=draw_id,
        group_id=group_id,
        status=DrawStatus.PENDING,
        created_at=datetime.now(tz=UTC),
        finalized_at=None,
        notification_sent_at=None,
    )
    draw_repo.get_by_id.return_value = draw

    # Only 2 members - insufficient
    members = [
        Member(
            id=str(uuid4()),
            group_id=group_id,
            name="Member 1",
            email="member1@example.com",
            is_active=True,
            created_at=None,
        ),
        Member(
            id=str(uuid4()),
            group_id=group_id,
            name="Member 2",
            email="member2@example.com",
            is_active=True,
            created_at=None,
        ),
    ]
    member_repo.list_by_group.return_value = (members, len(members))
    assignment_repo.count_by_draw = AsyncMock(return_value=0)

    use_case = ExecuteDrawUseCase(
        group_repository=group_repo,
        draw_repository=draw_repo,
        member_repository=member_repo,
        exclusion_repository=exclusion_repo,
        assignment_repository=assignment_repo,
        draw_algorithm=draw_algorithm,
    )
    command = ExecuteDrawCommand(
        draw_id=draw_id,
        requesting_user_id=user_id,
    )

    with pytest.raises(NoValidDrawConfigurationError):
        await use_case.execute(command)


@pytest.mark.anyio
async def test_finalize_draw_success():
    # Mock repositories
    group_repo = AsyncMock()
    draw_repo = AsyncMock()

    # Setup test data
    group_id = str(uuid4())
    user_id = str(uuid4())
    draw_id = str(uuid4())

    group = Group(
        id=group_id,
        admin_user_id=user_id,
        name="Test Group",
        historical_exclusions_enabled=True,
        historical_exclusions_lookback=1,
        created_at=None,
        updated_at=None,
    )
    group_repo.get_by_id.return_value = group

    draw = Draw(
        id=draw_id,
        group_id=group_id,
        status=DrawStatus.PENDING,
        created_at=datetime.now(tz=UTC),
        finalized_at=None,
        notification_sent_at=None,
    )
    draw_repo.get_by_id.return_value = draw

    finalized_draw = Draw(
        id=draw_id,
        group_id=draw.group_id,
        status=DrawStatus.FINALIZED,
        created_at=draw.created_at,
        finalized_at=datetime.now(tz=UTC),
        notification_sent_at=None,
    )
    draw_repo.update.return_value = finalized_draw

    # Execute use case
    assignment_repo = AsyncMock()
    assignment_repo.count_by_draw.return_value = 1

    use_case = FinalizeDrawUseCase(
        draw_repository=draw_repo,
        group_repository=group_repo,
        assignment_repository=assignment_repo,
    )
    command = FinalizeDrawCommand(
        draw_id=draw_id,
        requesting_user_id=user_id,
    )

    result = await use_case.execute(command)

    assert result.status == DrawStatus.FINALIZED
    assert result.finalized_at is not None
    draw_repo.update.assert_called_once()


@pytest.mark.anyio
async def test_finalize_draw_already_finalized():
    group_repo = AsyncMock()
    draw_repo = AsyncMock()

    group_id = str(uuid4())
    user_id = str(uuid4())
    draw_id = str(uuid4())

    group = Group(
        id=group_id,
        admin_user_id=user_id,
        name="Test Group",
        historical_exclusions_enabled=True,
        historical_exclusions_lookback=1,
        created_at=None,
        updated_at=None,
    )
    group_repo.get_by_id.return_value = group

    draw = Draw(
        id=draw_id,
        group_id=group_id,
        status=DrawStatus.FINALIZED,  # Already finalized
        created_at=datetime.now(tz=UTC),
        finalized_at=datetime.now(tz=UTC),
        notification_sent_at=None,
    )
    draw_repo.get_by_id.return_value = draw

    assignment_repo = AsyncMock()
    assignment_repo.count_by_draw.return_value = 1

    use_case = FinalizeDrawUseCase(
        draw_repository=draw_repo,
        group_repository=group_repo,
        assignment_repository=assignment_repo,
    )
    command = FinalizeDrawCommand(
        draw_id=draw_id,
        requesting_user_id=user_id,
    )

    with pytest.raises(DrawAlreadyFinalizedError):
        await use_case.execute(command)


@pytest.mark.anyio
async def test_get_draw_success():
    # Mock repositories
    group_repo = AsyncMock()
    draw_repo = AsyncMock()
    assignment_repo = AsyncMock()

    # Setup test data
    group_id = str(uuid4())
    user_id = str(uuid4())
    draw_id = str(uuid4())

    group = Group(
        id=group_id,
        admin_user_id=user_id,
        name="Test Group",
        historical_exclusions_enabled=True,
        historical_exclusions_lookback=1,
        created_at=None,
        updated_at=None,
    )
    group_repo.get_by_id.return_value = group

    draw = Draw(
        id=draw_id,
        group_id=group_id,
        status=DrawStatus.FINALIZED,
        created_at=datetime.now(tz=UTC),
        finalized_at=datetime.now(tz=UTC),
        notification_sent_at=None,
    )
    draw_repo.get_by_id.return_value = draw

    assignments = [
        Assignment(
            id=str(uuid4()),
            draw_id=draw_id,
            giver_member_id=str(uuid4()),
            receiver_member_id=str(uuid4()),
            encrypted_receiver_id=None,
            created_at=datetime.now(tz=UTC),
        )
    ]
    assignment_repo.list_by_draw.return_value = assignments

    # Execute use case
    use_case = GetDrawUseCase(
        draw_repository=draw_repo,
        group_repository=group_repo,
    )
    query = GetDrawQuery(
        draw_id=draw_id,
        requesting_user_id=user_id,
    )

    result = await use_case.execute(query)

    assert result.id == draw_id


@pytest.mark.anyio
async def test_list_draws_success():
    # Mock repositories
    group_repo = AsyncMock()
    draw_repo = AsyncMock()

    # Setup test data
    group_id = str(uuid4())
    user_id = str(uuid4())

    group = Group(
        id=group_id,
        admin_user_id=user_id,
        name="Test Group",
        historical_exclusions_enabled=True,
        historical_exclusions_lookback=1,
        created_at=None,
        updated_at=None,
    )
    group_repo.get_by_id.return_value = group

    draws = [
        Draw(
            id=str(uuid4()),
            group_id=group_id,
            status=DrawStatus.PENDING,
            created_at=datetime.now(tz=UTC),
            finalized_at=None,
            notification_sent_at=None,
        ),
        Draw(
            id=str(uuid4()),
            group_id=group_id,
            status=DrawStatus.FINALIZED,
            created_at=datetime.now(tz=UTC),
            finalized_at=datetime.now(tz=UTC),
            notification_sent_at=None,
        ),
    ]
    draw_repo.list_by_group.return_value = (draws, 2)

    # Execute use case
    use_case = ListDrawsUseCase(
        group_repository=group_repo,
        draw_repository=draw_repo,
    )
    query = ListDrawsQuery(
        group_id=group_id,
        requesting_user_id=user_id,
        status=None,
        page=1,
        page_size=10,
        sort="created_at",
    )

    result, total = await use_case.execute(query)

    assert len(result) == 2
    assert total == 2
    assert all(isinstance(d, Draw) for d in result)


@pytest.mark.anyio
async def test_notify_draw_success():
    # Mock repositories and services
    group_repo = AsyncMock()
    draw_repo = AsyncMock()
    member_repo = AsyncMock()
    assignment_repo = AsyncMock()
    notification_service = AsyncMock()

    # Setup test data
    group_id = str(uuid4())
    user_id = str(uuid4())
    draw_id = str(uuid4())
    member_ids = [str(uuid4()), str(uuid4()), str(uuid4())]

    group = Group(
        id=group_id,
        admin_user_id=user_id,
        name="Test Group",
        historical_exclusions_enabled=True,
        historical_exclusions_lookback=1,
        created_at=None,
        updated_at=None,
    )
    group_repo.get_by_id.return_value = group

    draw = Draw(
        id=draw_id,
        group_id=group_id,
        status=DrawStatus.FINALIZED,
        created_at=datetime.now(tz=UTC),
        finalized_at=datetime.now(tz=UTC),
        notification_sent_at=None,
    )
    draw_repo.get_by_id.return_value = draw

    members = [
        Member(
            id=mid,
            group_id=group_id,
            name=f"Member {i}",
            email=f"member{i}@example.com",
            is_active=True,
            created_at=None,
        )
        for i, mid in enumerate(member_ids)
    ]
    # Mock get_by_id for each member
    member_repo.get_by_id.side_effect = lambda mid: next((m for m in members if m.id == mid), None)

    assignments = [
        Assignment(
            id=str(uuid4()),
            draw_id=draw_id,
            giver_member_id=member_ids[0],
            receiver_member_id=member_ids[1],
            encrypted_receiver_id=None,
            created_at=datetime.now(tz=UTC),
        ),
    ]
    assignment_repo.list_by_draw.return_value = assignments

    # Execute use case
    use_case = NotifyDrawUseCase(
        group_repository=group_repo,
        draw_repository=draw_repo,
        member_repository=member_repo,
        assignment_repository=assignment_repo,
        notification_service=notification_service,
    )
    command = NotifyDrawCommand(
        draw_id=draw_id,
        requesting_user_id=user_id,
    )

    await use_case.execute(command)

    notification_service.send_assignment_notification.assert_called_once()
    draw_repo.update.assert_called_once()
