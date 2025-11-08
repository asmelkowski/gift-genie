# API Endpoint Implementation Plan: List Assignments for Draw

## 1. Endpoint Overview

This endpoint retrieves all assignments for a specific draw. It is admin-only in the MVP, meaning only the admin of the group that owns the draw can access these assignments. The endpoint supports an optional query parameter to include member names (giver and receiver) in the response, which is useful for displaying assignments in a human-readable format.

**Purpose:**
- Retrieve all gift assignments for a completed draw
- Optionally include member names for display purposes
- Support administrative review of draw results

**Key Business Rules:**
- Only group admins can view assignments
- Names are opt-in via query parameter to support future anonymous mode
- Draw must exist and belong to a group
- All assignments are returned (no pagination needed as draws have finite, small assignment counts)

## 2. Request Details

### HTTP Method
`GET`

### URL Structure
```
/api/v1/draws/{drawId}/assignments
```

### Path Parameters

| Parameter | Type | Required | Validation | Description |
|-----------|------|----------|------------|-------------|
| `drawId` | UUID | Yes | Valid UUID v4 | Unique identifier for the draw |

### Query Parameters

| Parameter | Type | Required | Default | Validation | Description |
|-----------|------|----------|---------|------------|-------------|
| `include` | string | No | `'none'` | Literal['names', 'none'] | Controls whether to include member names in response |

### Request Headers
- `Authorization: Bearer <token>` (required for authentication)

### Example Requests

**Without names:**
```http
GET /api/v1/draws/550e8400-e29b-41d4-a716-446655440000/assignments
Authorization: Bearer eyJhbGc...
```

**With names:**
```http
GET /api/v1/draws/550e8400-e29b-41d4-a716-446655440000/assignments?include=names
Authorization: Bearer eyJhbGc...
```

## 3. Used Types

### Application Layer DTOs

**New DTO: `ListAssignmentsQuery`**
Location: `backend/src/gift_genie/application/dto/list_assignments_query.py`

```python
from dataclasses import dataclass

@dataclass
class ListAssignmentsQuery:
    draw_id: str
    requesting_user_id: str
    include_names: bool
```

**New Use Case Result Type: `AssignmentWithNames`**
Location: Can be defined inline in use case or as separate DTO

```python
from dataclasses import dataclass
from datetime import datetime

@dataclass
class AssignmentWithNames:
    id: str
    draw_id: str
    giver_member_id: str
    receiver_member_id: str
    created_at: datetime
    giver_name: str | None = None
    receiver_name: str | None = None
```

### Presentation Layer Models (Pydantic)

**Response Model: `AssignmentResponse`**
Location: `backend/src/gift_genie/presentation/api/v1/draws.py`

```python
from pydantic import BaseModel
from datetime import datetime

class AssignmentResponse(BaseModel):
    id: str
    draw_id: str
    giver_member_id: str
    receiver_member_id: str
    created_at: datetime
    giver_name: str | None = None
    receiver_name: str | None = None
```

**Response Model: `ListAssignmentsResponse`**
```python
class ListAssignmentsResponse(BaseModel):
    data: list[AssignmentResponse]
    meta: dict  # Could include count, draw status, etc.
```

### Domain Entities (Existing)

- `Assignment` - Already defined in `domain/entities/assignment.py`
- `Draw` - Already defined in `domain/entities/draw.py`
- `Group` - Already defined in `domain/entities/group.py`
- `Member` - Already defined in `domain/entities/member.py`

## 4. Response Details

### Success Response (200 OK)

**Without names (`include=none` or default):**
```json
{
  "data": [
    {
      "id": "a1b2c3d4-e5f6-7890-ab12-cd34ef567890",
      "draw_id": "550e8400-e29b-41d4-a716-446655440000",
      "giver_member_id": "11111111-1111-1111-1111-111111111111",
      "receiver_member_id": "22222222-2222-2222-2222-222222222222",
      "created_at": "2025-10-13T10:30:00Z"
    },
    {
      "id": "b2c3d4e5-f6a7-8901-bc23-de45fa678901",
      "draw_id": "550e8400-e29b-41d4-a716-446655440000",
      "giver_member_id": "22222222-2222-2222-2222-222222222222",
      "receiver_member_id": "33333333-3333-3333-3333-333333333333",
      "created_at": "2025-10-13T10:30:00Z"
    }
  ],
  "meta": {
    "total": 2
  }
}
```

**With names (`include=names`):**
```json
{
  "data": [
    {
      "id": "a1b2c3d4-e5f6-7890-ab12-cd34ef567890",
      "draw_id": "550e8400-e29b-41d4-a716-446655440000",
      "giver_member_id": "11111111-1111-1111-1111-111111111111",
      "receiver_member_id": "22222222-2222-2222-2222-222222222222",
      "giver_name": "Alice Smith",
      "receiver_name": "Bob Johnson",
      "created_at": "2025-10-13T10:30:00Z"
    },
    {
      "id": "b2c3d4e5-f6a7-8901-bc23-de45fa678901",
      "draw_id": "550e8400-e29b-41d4-a716-446655440000",
      "giver_member_id": "22222222-2222-2222-2222-222222222222",
      "receiver_member_id": "33333333-3333-3333-3333-333333333333",
      "giver_name": "Bob Johnson",
      "receiver_name": "Carol Williams",
      "created_at": "2025-10-13T10:30:00Z"
    }
  ],
  "meta": {
    "total": 2
  }
}
```

### Error Responses

**401 Unauthorized**
```json
{
  "detail": "Not authenticated"
}
```

**403 Forbidden**
```json
{
  "detail": "You do not have permission to access this resource"
}
```

**404 Not Found**
```json
{
  "detail": "Draw not found"
}
```

**422 Unprocessable Entity** (Invalid parameters)
```json
{
  "detail": [
    {
      "loc": ["query", "include"],
      "msg": "Input should be 'names' or 'none'",
      "type": "literal_error"
    }
  ]
}
```

## 5. Data Flow

### Request Processing Flow

```
1. HTTP Request arrives at FastAPI endpoint
   ↓
2. FastAPI validates path parameter (drawId as UUID)
   ↓
3. FastAPI validates query parameter (include as Literal)
   ↓
4. get_current_user dependency extracts user_id from JWT
   ↓
5. Dependencies inject repositories and use case
   ↓
6. Endpoint constructs ListAssignmentsQuery DTO
   ↓
7. ListAssignmentsUseCase.execute() is called
   ↓
8. Use case verifies draw exists (DrawRepository.get_by_id)
   ↓
9. Use case verifies user is admin (GroupRepository.get_by_id)
   ↓
10. Use case fetches assignments (AssignmentRepository.list_by_draw)
   ↓
11. If include_names=True:
    - Use case fetches member details for each giver/receiver
    - Enriches assignment data with names
   ↓
12. Use case returns enriched assignments
   ↓
13. Endpoint transforms to Pydantic response models
   ↓
14. FastAPI serializes to JSON and returns 200 OK
```

### Use Case Internal Logic

```python
async def execute(self, query: ListAssignmentsQuery) -> list[Assignment | AssignmentWithNames]:
    # 1. Fetch draw and verify existence
    draw = await self.draw_repository.get_by_id(query.draw_id)
    if not draw:
        raise DrawNotFoundError()

    # 2. Fetch parent group and verify authorization
    group = await self.group_repository.get_by_id(draw.group_id)
    if not group:
        raise DrawNotFoundError()  # Shouldn't happen with referential integrity

    if group.admin_user_id != query.requesting_user_id:
        raise ForbiddenError()

    # 3. Fetch all assignments for the draw
    assignments = await self.assignment_repository.list_by_draw(query.draw_id)

    # 4. Optionally enrich with names
    if query.include_names:
        # Collect unique member IDs
        member_ids = set()
        for assignment in assignments:
            member_ids.add(assignment.giver_member_id)
            member_ids.add(assignment.receiver_member_id)

        # Fetch all members in one batch (optimization)
        members_map = {}
        for member_id in member_ids:
            member = await self.member_repository.get_by_id(member_id)
            if member:
                members_map[member_id] = member.name

        # Enrich assignments
        enriched = []
        for assignment in assignments:
            enriched.append(AssignmentWithNames(
                id=assignment.id,
                draw_id=assignment.draw_id,
                giver_member_id=assignment.giver_member_id,
                receiver_member_id=assignment.receiver_member_id,
                created_at=assignment.created_at,
                giver_name=members_map.get(assignment.giver_member_id),
                receiver_name=members_map.get(assignment.receiver_member_id),
            ))
        return enriched

    return assignments
```

### Database Interactions

1. **Draw Lookup**: Single query to `draws` table by ID
2. **Group Lookup**: Single query to `groups` table by ID
3. **Assignments List**: Single query to `assignments` table filtered by draw_id
4. **Member Names** (if requested): N queries to `members` table (could be optimized with IN clause)

**SQL Queries (approximate):**

```sql
-- Step 1: Get draw
SELECT * FROM draws WHERE id = $1;

-- Step 2: Get group
SELECT * FROM groups WHERE id = $1;

-- Step 3: Get assignments
SELECT * FROM assignments WHERE draw_id = $1;

-- Step 4 (optional): Get member names
SELECT id, name FROM members WHERE id IN ($1, $2, $3, ...);
```

## 6. Security Considerations

### Authentication
- **Mechanism**: JWT Bearer token validation via `get_current_user` dependency
- **Validation**: Token signature, expiration, and payload integrity checked
- **Error**: Returns 401 if token is missing, invalid, or expired

### Authorization
- **Level**: Group admin only
- **Check**: Verify `group.admin_user_id == requesting_user_id`
- **Rationale**: Only group admins should see assignment details
- **Error**: Returns 403 if user is not the group admin

### Data Privacy
- **Name Disclosure**: Names only included when explicitly requested via `include=names`
- **Future-proofing**: Supports future anonymous mode where names are never disclosed
- **Encryption Field**: `encrypted_receiver_id` prepared for post-MVP anonymous mode

### Information Disclosure Prevention
- **Consistent 404**: Return 404 for both non-existent draws AND unauthorized access
- **Rationale**: Prevents attackers from enumerating valid draw IDs
- **Implementation**: Check existence before authorization, return 404 for both cases

### Injection Prevention
- **UUID Validation**: Path parameter validated as UUID by FastAPI
- **SQL Injection**: Prevented by SQLAlchemy parameterized queries
- **Parameter Validation**: `include` parameter validated as Literal type

### Rate Limiting (Future Consideration)
- Consider rate limiting on this endpoint to prevent scraping
- Could be implemented at API gateway or middleware level

### Audit Logging
- Log all access attempts with:
  - User ID
  - Draw ID
  - Timestamp
  - Success/failure
  - Include parameter value
- Use for security monitoring and compliance

## 7. Error Handling

### Application Layer Errors

All application errors are defined in `application/errors.py` and handled by the `@handle_application_exceptions` decorator.

**Errors Used:**
1. `DrawNotFoundError` → 404
   - Raised when draw doesn't exist
   - Raised when parent group doesn't exist (masquerading as draw not found)

2. `ForbiddenError` → 403
   - Raised when user is not the group admin

### Exception Handling Pattern

```python
@router.get("/draws/{draw_id}/assignments", response_model=ListAssignmentsResponse)
@handle_application_exceptions
async def list_assignments(
    draw_id: UUID = Path(...),
    include: Literal["names", "none"] = Query("none"),
    current_user_id: Annotated[str, Depends(get_current_user)],
    use_case: Annotated[ListAssignmentsUseCase, Depends(get_list_assignments_use_case)],
):
    # Implementation
    pass
```

### Error Logging Strategy

```python
# In use case
logger.info(f"Listing assignments for draw {query.draw_id} by user {query.requesting_user_id}")

try:
    # ... logic
except DrawNotFoundError:
    logger.warning(f"Draw {query.draw_id} not found or unauthorized for user {query.requesting_user_id}")
    raise

except ForbiddenError:
    logger.warning(f"User {query.requesting_user_id} forbidden from accessing draw {query.draw_id}")
    raise
```

### Edge Cases

1. **Draw exists but has no assignments**
   - Return: Empty list with 200 OK
   - Response: `{"data": [], "meta": {"total": 0}}`

2. **Member deleted but assignment exists**
   - Scenario: Member deleted after assignment created (shouldn't happen with CASCADE)
   - Handling: Return assignment without name (name field will be None)

3. **Invalid UUID format**
   - Handled by: FastAPI/Pydantic validation
   - Return: 422 with validation error details

4. **Invalid include parameter**
   - Handled by: FastAPI/Pydantic Literal validation
   - Return: 422 with validation error details

## 8. Performance Considerations

### Database Query Optimization

**Current Approach:**
- 1 query for draw lookup
- 1 query for group lookup
- 1 query for assignments list
- N queries for member names (where N = unique member count)

**Total: 3 + N queries**

**Optimization Opportunities:**

1. **Batch Member Lookup**
   - Use SQL IN clause to fetch all members in single query
   - Update repository interface to support `get_many_by_ids(ids: list[str])`
   - Reduces N queries to 1 query

2. **JOIN Optimization** (Future)
   - Repository could JOIN assignments with members table
   - Single query returns all data
   - Requires repository method enhancement

3. **Caching** (Future)
   - Member names could be cached (they rarely change)
   - Draw results could be cached (immutable after finalization)
   - Use Redis or in-memory cache

### Expected Performance

**Typical Draw Size:**
- 10-20 active members in a group
- 10-20 assignments per draw

**Query Performance:**
- Draw lookup: ~1ms (indexed by ID)
- Group lookup: ~1ms (indexed by ID)
- Assignments list: ~5ms (indexed by draw_id, small result set)
- Member lookups: ~10ms (with batch optimization)

**Total Response Time: ~20-30ms** (excluding network latency)

### Scalability Considerations

1. **No Pagination Needed**
   - Draws have finite, small assignment counts
   - All assignments fit in single response
   - No need for cursor or offset pagination

2. **Read-Heavy Operation**
   - Assignments are immutable after finalization
   - Perfect candidate for caching
   - Can use read replicas for scaling

3. **Concurrent Access**
   - Multiple admins may view assignments simultaneously
   - Read operations are inherently safe
   - No locking required

### Monitoring Metrics

Track the following:
- Request latency (p50, p95, p99)
- Number of assignments returned per request
- Frequency of `include=names` usage
- Database query times
- Error rates by type

## 9. Implementation Steps

### Step 1: Create DTO for Query Input
**File**: `backend/src/gift_genie/application/dto/list_assignments_query.py`

```python
from dataclasses import dataclass

@dataclass
class ListAssignmentsQuery:
    """Query to list assignments for a draw with optional name enrichment"""
    draw_id: str
    requesting_user_id: str
    include_names: bool
```

### Step 2: Enhance Repository Interface (Optional)
**File**: `backend/src/gift_genie/domain/interfaces/repositories.py`

Add batch member lookup method to `MemberRepository` protocol (optional optimization):

```python
@runtime_checkable
class MemberRepository(Protocol):
    # ... existing methods ...

    async def get_many_by_ids(self, member_ids: list[str]) -> dict[str, Member]:
        """Fetch multiple members by IDs and return as dict mapping ID to Member"""
        ...
```

**File**: `backend/src/gift_genie/infrastructure/database/repositories/members.py`

Implement the batch method (optional):

```python
async def get_many_by_ids(self, member_ids: list[str]) -> dict[str, Member]:
    uuids = [UUID(mid) for mid in member_ids]
    stmt = select(MemberModel).where(MemberModel.id.in_(uuids))
    res = await self._session.execute(stmt)
    models = res.scalars().all()
    return {str(model.id): self._to_domain(model) for model in models}
```

### Step 3: Create Use Case
**File**: `backend/src/gift_genie/application/use_cases/list_assignments.py`

```python
from __future__ import annotations

from dataclasses import dataclass

from gift_genie.application.dto.list_assignments_query import ListAssignmentsQuery
from gift_genie.application.errors import DrawNotFoundError, ForbiddenError
from gift_genie.domain.entities.assignment import Assignment
from gift_genie.domain.interfaces.repositories import (
    AssignmentRepository,
    DrawRepository,
    GroupRepository,
    MemberRepository,
)
from loguru import logger


@dataclass(slots=True)
class AssignmentWithNames:
    """Assignment enriched with member names"""
    id: str
    draw_id: str
    giver_member_id: str
    receiver_member_id: str
    created_at: datetime
    giver_name: str | None
    receiver_name: str | None


@dataclass(slots=True)
class ListAssignmentsUseCase:
    draw_repository: DrawRepository
    group_repository: GroupRepository
    assignment_repository: AssignmentRepository
    member_repository: MemberRepository

    async def execute(
        self, query: ListAssignmentsQuery
    ) -> list[Assignment] | list[AssignmentWithNames]:
        logger.info(
            f"Listing assignments for draw {query.draw_id} "
            f"by user {query.requesting_user_id}, include_names={query.include_names}"
        )

        # Fetch draw and verify existence
        draw = await self.draw_repository.get_by_id(query.draw_id)
        if draw is None:
            logger.warning(f"Draw {query.draw_id} not found")
            raise DrawNotFoundError()

        # Fetch parent group to verify authorization
        group = await self.group_repository.get_by_id(draw.group_id)
        if group is None:
            logger.error(f"Group {draw.group_id} not found for draw {query.draw_id}")
            raise DrawNotFoundError()

        # Verify authorization: user must be the group admin
        if group.admin_user_id != query.requesting_user_id:
            logger.warning(
                f"User {query.requesting_user_id} forbidden from accessing "
                f"draw {query.draw_id} (group {group.id})"
            )
            raise ForbiddenError()

        # Fetch all assignments for the draw
        assignments = await self.assignment_repository.list_by_draw(query.draw_id)
        logger.info(f"Found {len(assignments)} assignments for draw {query.draw_id}")

        # If names not requested, return basic assignments
        if not query.include_names:
            return assignments

        # Enrich with member names
        # Collect unique member IDs
        member_ids = set()
        for assignment in assignments:
            member_ids.add(assignment.giver_member_id)
            member_ids.add(assignment.receiver_member_id)

        # Fetch all members (optimization: batch fetch)
        members_map: dict[str, str] = {}
        for member_id in member_ids:
            member = await self.member_repository.get_by_id(member_id)
            if member:
                members_map[member_id] = member.name
            else:
                logger.warning(f"Member {member_id} not found for assignment")

        # Build enriched results
        enriched: list[AssignmentWithNames] = []
        for assignment in assignments:
            enriched.append(
                AssignmentWithNames(
                    id=assignment.id,
                    draw_id=assignment.draw_id,
                    giver_member_id=assignment.giver_member_id,
                    receiver_member_id=assignment.receiver_member_id,
                    created_at=assignment.created_at,
                    giver_name=members_map.get(assignment.giver_member_id),
                    receiver_name=members_map.get(assignment.receiver_member_id),
                )
            )

        return enriched
```

### Step 4: Add Endpoint to Router
**File**: `backend/src/gift_genie/presentation/api/v1/draws.py`

Add imports at the top:
```python
from gift_genie.application.dto.list_assignments_query import ListAssignmentsQuery
from gift_genie.application.use_cases.list_assignments import (
    ListAssignmentsUseCase,
    AssignmentWithNames,
)
```

Add Pydantic response models:
```python
class AssignmentResponse(BaseModel):
    id: str
    draw_id: str
    giver_member_id: str
    receiver_member_id: str
    created_at: datetime
    giver_name: str | None = None
    receiver_name: str | None = None


class ListAssignmentsResponse(BaseModel):
    data: list[AssignmentResponse]
    meta: dict
```

Add dependency injection for use case:
```python
async def get_list_assignments_use_case(
    draw_repo: Annotated[DrawRepository, Depends(get_draw_repository)],
    group_repo: Annotated[GroupRepository, Depends(get_group_repository)],
    assignment_repo: Annotated[AssignmentRepository, Depends(get_assignment_repository)],
    member_repo: Annotated[MemberRepository, Depends(get_member_repository)],
) -> AsyncGenerator[ListAssignmentsUseCase, None]:
    yield ListAssignmentsUseCase(
        draw_repository=draw_repo,
        group_repository=group_repo,
        assignment_repository=assignment_repo,
        member_repository=member_repo,
    )
```

Add endpoint:
```python
@router.get("/draws/{draw_id}/assignments", response_model=ListAssignmentsResponse)
@handle_application_exceptions
async def list_assignments(
    draw_id: UUID = Path(..., description="Draw UUID"),
    include: Literal["names", "none"] = Query("none", description="Include member names"),
    *,
    current_user_id: Annotated[str, Depends(get_current_user)],
    use_case: Annotated[ListAssignmentsUseCase, Depends(get_list_assignments_use_case)],
):
    query = ListAssignmentsQuery(
        draw_id=str(draw_id),
        requesting_user_id=current_user_id,
        include_names=(include == "names"),
    )

    assignments = await use_case.execute(query)

    # Transform to response models
    data = []
    for assignment in assignments:
        if isinstance(assignment, AssignmentWithNames):
            data.append(
                AssignmentResponse(
                    id=assignment.id,
                    draw_id=assignment.draw_id,
                    giver_member_id=assignment.giver_member_id,
                    receiver_member_id=assignment.receiver_member_id,
                    created_at=assignment.created_at,
                    giver_name=assignment.giver_name,
                    receiver_name=assignment.receiver_name,
                )
            )
        else:
            data.append(
                AssignmentResponse(
                    id=assignment.id,
                    draw_id=assignment.draw_id,
                    giver_member_id=assignment.giver_member_id,
                    receiver_member_id=assignment.receiver_member_id,
                    created_at=assignment.created_at,
                )
            )

    return ListAssignmentsResponse(
        data=data,
        meta={"total": len(data)},
    )
```

### Step 5: Write Unit Tests
**File**: `backend/tests/test_list_assignments_use_case.py`

Test cases to cover:
- ✅ Success: List assignments without names
- ✅ Success: List assignments with names
- ✅ Error: Draw not found
- ✅ Error: User not authorized (not group admin)
- ✅ Edge: Empty assignments list
- ✅ Edge: Missing member (name should be None)

**File**: `backend/tests/test_list_assignments_api.py`

Test cases to cover:
- ✅ Success: 200 with assignments (include=none)
- ✅ Success: 200 with assignments and names (include=names)
- ✅ Error: 401 without authentication
- ✅ Error: 403 when not group admin
- ✅ Error: 404 when draw not found
- ✅ Error: 422 with invalid UUID
- ✅ Error: 422 with invalid include parameter

### Step 6: Create Integration Test (Hurl)
**File**: `hurl/list_assignments_operations.hurl`

```hurl
# Test: List assignments without names
GET {{base_url}}/draws/{{draw_id}}/assignments
Authorization: Bearer {{auth_token}}
HTTP 200
[Asserts]
jsonpath "$.data" isCollection
jsonpath "$.data[0].id" exists
jsonpath "$.data[0].giver_member_id" exists
jsonpath "$.data[0].receiver_member_id" exists
jsonpath "$.data[0].giver_name" not exists
jsonpath "$.meta.total" exists

# Test: List assignments with names
GET {{base_url}}/draws/{{draw_id}}/assignments?include=names
Authorization: Bearer {{auth_token}}
HTTP 200
[Asserts]
jsonpath "$.data[0].giver_name" exists
jsonpath "$.data[0].receiver_name" exists

# Test: Unauthorized access
GET {{base_url}}/draws/{{draw_id}}/assignments
HTTP 401

# Test: Invalid draw ID
GET {{base_url}}/draws/invalid-uuid/assignments
Authorization: Bearer {{auth_token}}
HTTP 422
```

### Step 7: Run Tests and Verify
```bash
# Backend tests
cd backend
make test

# API integration tests
cd hurl
hurl list_assignments_operations.hurl

# Manual testing
curl -X GET "http://localhost:8000/api/v1/draws/{draw_id}/assignments" \
  -H "Authorization: Bearer <token>"

curl -X GET "http://localhost:8000/api/v1/draws/{draw_id}/assignments?include=names" \
  -H "Authorization: Bearer <token>"
```

### Step 8: Update Documentation
- Update API documentation in `AGENTS.md` or equivalent
- Document the endpoint in OpenAPI spec (FastAPI auto-generates)
- Add example usage in README or API guide

### Step 9: Code Review Checklist
- [ ] Input validation handles all edge cases
- [ ] Authorization check prevents unauthorized access
- [ ] Error responses are consistent with API spec
- [ ] Logging includes security audit information
- [ ] Tests cover success and error scenarios
- [ ] Code follows clean architecture principles
- [ ] Type hints are complete and accurate
- [ ] Documentation is clear and complete

### Step 10: Deployment
- Merge to main branch after review
- Deploy to staging environment
- Run integration tests in staging
- Deploy to production
- Monitor error rates and performance metrics

## 10. Testing Strategy

### Unit Tests (Use Case)
**File**: `backend/tests/test_list_assignments_use_case.py`

```python
import pytest
from gift_genie.application.use_cases.list_assignments import ListAssignmentsUseCase
from gift_genie.application.dto.list_assignments_query import ListAssignmentsQuery
from gift_genie.application.errors import DrawNotFoundError, ForbiddenError

class TestListAssignmentsUseCase:
    async def test_list_assignments_without_names_success(self):
        # Mock repositories
        # Test successful listing without names
        pass

    async def test_list_assignments_with_names_success(self):
        # Test successful listing with names
        pass

    async def test_draw_not_found_raises_error(self):
        # Test 404 when draw doesn't exist
        pass

    async def test_forbidden_when_not_admin(self):
        # Test 403 when user is not group admin
        pass
```

### Integration Tests (API)
**File**: `backend/tests/test_list_assignments_api.py`

```python
import pytest
from httpx import AsyncClient

class TestListAssignmentsAPI:
    async def test_list_assignments_200_without_names(self):
        # Test GET /draws/{id}/assignments returns 200
        pass

    async def test_list_assignments_200_with_names(self):
        # Test GET /draws/{id}/assignments?include=names returns 200
        pass

    async def test_list_assignments_401_without_auth(self):
        # Test 401 without authentication
        pass

    async def test_list_assignments_403_not_admin(self):
        # Test 403 when not group admin
        pass

    async def test_list_assignments_404_draw_not_found(self):
        # Test 404 when draw doesn't exist
        pass
```

## 11. Future Enhancements

1. **Anonymous Mode**
   - Use `encrypted_receiver_id` field
   - Giver sees encrypted ID instead of actual member ID
   - Requires decryption service for giver to reveal receiver

2. **Assignment Filtering**
   - Filter by giver or receiver member ID
   - Support for partial assignment views

3. **Caching**
   - Cache finalized draw assignments
   - Invalidate on draw status change

4. **Batch Member Lookup**
   - Optimize member name fetching with single query
   - Reduce database round trips

5. **Export Functionality**
   - Export assignments as CSV/PDF
   - Include in notification emails

6. **Assignment History**
   - Track when assignments were viewed
   - Audit trail for compliance
