import pytest
from unittest.mock import AsyncMock
from uuid import uuid4
from datetime import datetime

from gift_genie.application.dto.list_assignments_query import ListAssignmentsQuery
from gift_genie.application.errors import DrawNotFoundError, ForbiddenError
from gift_genie.application.use_cases.list_assignments import (
    ListAssignmentsUseCase,
    AssignmentWithNames,
)
from gift_genie.domain.entities.assignment import Assignment
from gift_genie.domain.entities.draw import Draw
from gift_genie.domain.entities.enums import DrawStatus
from gift_genie.domain.entities.group import Group
from gift_genie.domain.entities.member import Member


@pytest.mark.anyio
async def test_list_assignments_without_names_success():
    # Mock repositories
    draw_repo = AsyncMock()
    group_repo = AsyncMock()
    assignment_repo = AsyncMock()
    member_repo = AsyncMock()

    # Setup test data
    draw_id = str(uuid4())
    group_id = str(uuid4())
    user_id = str(uuid4())
    giver_id = str(uuid4())
    receiver_id = str(uuid4())

    draw = Draw(
        id=draw_id,
        group_id=group_id,
        status=DrawStatus.FINALIZED,
        created_at=datetime.now(),
        finalized_at=datetime.now(),
        notification_sent_at=None,
    )
    draw_repo.get_by_id.return_value = draw

    group = Group(
        id=group_id,
        admin_user_id=user_id,
        name="Test Group",
        historical_exclusions_enabled=True,
        historical_exclusions_lookback=1,
        created_at=datetime.now(),
        updated_at=datetime.now(),
    )
    group_repo.get_by_id.return_value = group

    assignments = [
        Assignment(
            id=str(uuid4()),
            draw_id=draw_id,
            giver_member_id=giver_id,
            receiver_member_id=receiver_id,
            encrypted_receiver_id=None,
            created_at=datetime.now(),
        )
    ]
    assignment_repo.list_by_draw.return_value = assignments

    # Create use case
    use_case = ListAssignmentsUseCase(
        draw_repository=draw_repo,
        group_repository=group_repo,
        assignment_repository=assignment_repo,
        member_repository=member_repo,
    )

    # Execute
    query = ListAssignmentsQuery(
        draw_id=draw_id,
        requesting_user_id=user_id,
        include_names=False,
    )
    result = await use_case.execute(query)

    # Assert
    assert len(result) == 1
    assert isinstance(result[0], Assignment)
    assert result[0].id == assignments[0].id
    draw_repo.get_by_id.assert_called_once_with(draw_id)
    group_repo.get_by_id.assert_called_once_with(group_id)
    assignment_repo.list_by_draw.assert_called_once_with(draw_id)
    member_repo.get_many_by_ids.assert_not_called()


@pytest.mark.anyio
async def test_list_assignments_with_names_success():
    # Mock repositories
    draw_repo = AsyncMock()
    group_repo = AsyncMock()
    assignment_repo = AsyncMock()
    member_repo = AsyncMock()

    # Setup test data
    draw_id = str(uuid4())
    group_id = str(uuid4())
    user_id = str(uuid4())
    giver_id = str(uuid4())
    receiver_id = str(uuid4())

    draw = Draw(
        id=draw_id,
        group_id=group_id,
        status=DrawStatus.FINALIZED,
        created_at=datetime.now(),
        finalized_at=datetime.now(),
        notification_sent_at=None,
    )
    draw_repo.get_by_id.return_value = draw

    group = Group(
        id=group_id,
        admin_user_id=user_id,
        name="Test Group",
        historical_exclusions_enabled=True,
        historical_exclusions_lookback=1,
        created_at=datetime.now(),
        updated_at=datetime.now(),
    )
    group_repo.get_by_id.return_value = group

    assignments = [
        Assignment(
            id=str(uuid4()),
            draw_id=draw_id,
            giver_member_id=giver_id,
            receiver_member_id=receiver_id,
            encrypted_receiver_id=None,
            created_at=datetime.now(),
        )
    ]
    assignment_repo.list_by_draw.return_value = assignments

    members = {
        giver_id: Member(
            id=giver_id,
            group_id=group_id,
            name="Alice",
            email="alice@example.com",
            is_active=True,
            created_at=datetime.now(),
        ),
        receiver_id: Member(
            id=receiver_id,
            group_id=group_id,
            name="Bob",
            email="bob@example.com",
            is_active=True,
            created_at=datetime.now(),
        ),
    }
    member_repo.get_many_by_ids.return_value = members

    # Create use case
    use_case = ListAssignmentsUseCase(
        draw_repository=draw_repo,
        group_repository=group_repo,
        assignment_repository=assignment_repo,
        member_repository=member_repo,
    )

    # Execute
    query = ListAssignmentsQuery(
        draw_id=draw_id,
        requesting_user_id=user_id,
        include_names=True,
    )
    result = await use_case.execute(query)

    # Assert
    assert len(result) == 1
    assert isinstance(result[0], AssignmentWithNames)
    assert result[0].id == assignments[0].id
    assert result[0].giver_name == "Alice"
    assert result[0].receiver_name == "Bob"
    # Check that get_many_by_ids was called with the correct set of member IDs
    call_args = member_repo.get_many_by_ids.call_args[0][0]
    assert set(call_args) == {giver_id, receiver_id}


@pytest.mark.anyio
async def test_draw_not_found_raises_error():
    # Mock repositories
    draw_repo = AsyncMock()
    group_repo = AsyncMock()
    assignment_repo = AsyncMock()
    member_repo = AsyncMock()

    draw_repo.get_by_id.return_value = None

    # Create use case
    use_case = ListAssignmentsUseCase(
        draw_repository=draw_repo,
        group_repository=group_repo,
        assignment_repository=assignment_repo,
        member_repository=member_repo,
    )

    # Execute
    query = ListAssignmentsQuery(
        draw_id=str(uuid4()),
        requesting_user_id=str(uuid4()),
        include_names=False,
    )

    # Assert
    with pytest.raises(DrawNotFoundError):
        await use_case.execute(query)


@pytest.mark.anyio
async def test_forbidden_when_not_admin():
    # Mock repositories
    draw_repo = AsyncMock()
    group_repo = AsyncMock()
    assignment_repo = AsyncMock()
    member_repo = AsyncMock()

    # Setup test data
    draw_id = str(uuid4())
    group_id = str(uuid4())
    admin_user_id = str(uuid4())
    requesting_user_id = str(uuid4())

    draw = Draw(
        id=draw_id,
        group_id=group_id,
        status=DrawStatus.FINALIZED,
        created_at=datetime.now(),
        finalized_at=datetime.now(),
        notification_sent_at=None,
    )
    draw_repo.get_by_id.return_value = draw

    group = Group(
        id=group_id,
        admin_user_id=admin_user_id,  # Different from requesting user
        name="Test Group",
        historical_exclusions_enabled=True,
        historical_exclusions_lookback=1,
        created_at=datetime.now(),
        updated_at=datetime.now(),
    )
    group_repo.get_by_id.return_value = group

    # Create use case
    use_case = ListAssignmentsUseCase(
        draw_repository=draw_repo,
        group_repository=group_repo,
        assignment_repository=assignment_repo,
        member_repository=member_repo,
    )

    # Execute
    query = ListAssignmentsQuery(
        draw_id=draw_id,
        requesting_user_id=requesting_user_id,
        include_names=False,
    )

    # Assert
    with pytest.raises(ForbiddenError):
        await use_case.execute(query)


@pytest.mark.anyio
async def test_empty_assignments_list():
    # Mock repositories
    draw_repo = AsyncMock()
    group_repo = AsyncMock()
    assignment_repo = AsyncMock()
    member_repo = AsyncMock()

    # Setup test data
    draw_id = str(uuid4())
    group_id = str(uuid4())
    user_id = str(uuid4())

    draw = Draw(
        id=draw_id,
        group_id=group_id,
        status=DrawStatus.FINALIZED,
        created_at=datetime.now(),
        finalized_at=datetime.now(),
        notification_sent_at=None,
    )
    draw_repo.get_by_id.return_value = draw

    group = Group(
        id=group_id,
        admin_user_id=user_id,
        name="Test Group",
        historical_exclusions_enabled=True,
        historical_exclusions_lookback=1,
        created_at=datetime.now(),
        updated_at=datetime.now(),
    )
    group_repo.get_by_id.return_value = group

    assignment_repo.list_by_draw.return_value = []  # Empty list

    # Create use case
    use_case = ListAssignmentsUseCase(
        draw_repository=draw_repo,
        group_repository=group_repo,
        assignment_repository=assignment_repo,
        member_repository=member_repo,
    )

    # Execute
    query = ListAssignmentsQuery(
        draw_id=draw_id,
        requesting_user_id=user_id,
        include_names=False,
    )
    result = await use_case.execute(query)

    # Assert
    assert len(result) == 0


@pytest.mark.anyio
async def test_missing_member_name_is_none():
    # Mock repositories
    draw_repo = AsyncMock()
    group_repo = AsyncMock()
    assignment_repo = AsyncMock()
    member_repo = AsyncMock()

    # Setup test data
    draw_id = str(uuid4())
    group_id = str(uuid4())
    user_id = str(uuid4())
    giver_id = str(uuid4())
    receiver_id = str(uuid4())

    draw = Draw(
        id=draw_id,
        group_id=group_id,
        status=DrawStatus.FINALIZED,
        created_at=datetime.now(),
        finalized_at=datetime.now(),
        notification_sent_at=None,
    )
    draw_repo.get_by_id.return_value = draw

    group = Group(
        id=group_id,
        admin_user_id=user_id,
        name="Test Group",
        historical_exclusions_enabled=True,
        historical_exclusions_lookback=1,
        created_at=datetime.now(),
        updated_at=datetime.now(),
    )
    group_repo.get_by_id.return_value = group

    assignments = [
        Assignment(
            id=str(uuid4()),
            draw_id=draw_id,
            giver_member_id=giver_id,
            receiver_member_id=receiver_id,
            encrypted_receiver_id=None,
            created_at=datetime.now(),
        )
    ]
    assignment_repo.list_by_draw.return_value = assignments

    # Only return giver, receiver not found
    members = {
        giver_id: Member(
            id=giver_id,
            group_id=group_id,
            name="Alice",
            email="alice@example.com",
            is_active=True,
            created_at=datetime.now(),
        ),
    }
    member_repo.get_many_by_ids.return_value = members

    # Create use case
    use_case = ListAssignmentsUseCase(
        draw_repository=draw_repo,
        group_repository=group_repo,
        assignment_repository=assignment_repo,
        member_repository=member_repo,
    )

    # Execute
    query = ListAssignmentsQuery(
        draw_id=draw_id,
        requesting_user_id=user_id,
        include_names=True,
    )
    result = await use_case.execute(query)

    # Assert
    assert len(result) == 1
    assert isinstance(result[0], AssignmentWithNames)
    assert result[0].giver_name == "Alice"
    assert result[0].receiver_name is None
