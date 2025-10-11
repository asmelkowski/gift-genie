# API Endpoint Implementation Plan: Exclusions Management

## 1. Endpoint Overview

This plan covers four REST API endpoints for managing exclusions within groups:

1. **GET /api/v1/groups/{groupId}/exclusions** - List and filter exclusions in a group with pagination
2. **POST /api/v1/groups/{groupId}/exclusions** - Create a single exclusion (one-way or mutual)
3. **POST /api/v1/groups/{groupId}/exclusions/bulk** - Create multiple exclusions in a single transaction
4. **DELETE /api/v1/groups/{groupId}/exclusions/{exclusionId}** - Delete a specific exclusion

Exclusions are rules that prevent specific member pairings in gift exchange draws. They can be manual (user-created) or historical (system-generated from past draws). Mutual exclusions apply in both directions and are stored as two separate database rows with the `is_mutual` flag set to `true`.

## 2. Request Details

### GET /api/v1/groups/{groupId}/exclusions

- **HTTP Method**: GET
- **URL Structure**: `/api/v1/groups/{groupId}/exclusions`
- **Parameters**:
  - **Path** (required):
    - `groupId` (UUID): Group identifier
  - **Query** (optional):
    - `type` (string): Filter by 'manual' or 'historical'
    - `giver_member_id` (UUID): Filter by giver member
    - `receiver_member_id` (UUID): Filter by receiver member
    - `page` (integer, default=1, min=1): Page number
    - `page_size` (integer, default=10, min=1, max=100): Items per page
    - `sort` (string, default='exclusion_type,name'): Sort order
- **Request Body**: None

### POST /api/v1/groups/{groupId}/exclusions

- **HTTP Method**: POST
- **URL Structure**: `/api/v1/groups/{groupId}/exclusions`
- **Parameters**:
  - **Path** (required):
    - `groupId` (UUID): Group identifier
- **Request Body** (required):
```json
{
  "giver_member_id": "uuid",
  "receiver_member_id": "uuid",
  "is_mutual": false
}
```

### POST /api/v1/groups/{groupId}/exclusions/bulk

- **HTTP Method**: POST
- **URL Structure**: `/api/v1/groups/{groupId}/exclusions/bulk`
- **Parameters**:
  - **Path** (required):
    - `groupId` (UUID): Group identifier
- **Request Body** (required):
```json
{
  "items": [
    {
      "giver_member_id": "uuid",
      "receiver_member_id": "uuid",
      "is_mutual": false
    }
  ]
}
```

### DELETE /api/v1/groups/{groupId}/exclusions/{exclusionId}

- **HTTP Method**: DELETE
- **URL Structure**: `/api/v1/groups/{groupId}/exclusions/{exclusionId}`
- **Parameters**:
  - **Path** (required):
    - `groupId` (UUID): Group identifier
    - `exclusionId` (UUID): Exclusion identifier
- **Request Body**: None

## 3. Used Types

### Domain Entity (Already Exists)
- `Exclusion` - `backend/src/gift_genie/domain/entities/exclusion.py`
- `ExclusionType` - `backend/src/gift_genie/domain/entities/enums.py`

### Repository Interface (To Be Created)
- `ExclusionRepository` protocol in `backend/src/gift_genie/domain/interfaces/repositories.py`

### Application Layer (To Be Created)

#### DTOs/Commands in `backend/src/gift_genie/application/dto/`
1. **list_exclusions_query.py**
```python
@dataclass
class ListExclusionsQuery:
    group_id: str
    requesting_user_id: str
    type: ExclusionType | None
    giver_member_id: str | None
    receiver_member_id: str | None
    page: int
    page_size: int
    sort: str
```

2. **create_exclusion_command.py**
```python
@dataclass
class CreateExclusionCommand:
    group_id: str
    requesting_user_id: str
    giver_member_id: str
    receiver_member_id: str
    is_mutual: bool
```

3. **create_exclusions_bulk_command.py**
```python
@dataclass
class ExclusionItem:
    giver_member_id: str
    receiver_member_id: str
    is_mutual: bool

@dataclass
class CreateExclusionsBulkCommand:
    group_id: str
    requesting_user_id: str
    items: list[ExclusionItem]
```

4. **delete_exclusion_command.py**
```python
@dataclass
class DeleteExclusionCommand:
    group_id: str
    exclusion_id: str
    requesting_user_id: str
```

#### Use Cases in `backend/src/gift_genie/application/use_cases/`
1. **list_exclusions.py** - `ListExclusionsUseCase`
2. **create_exclusion.py** - `CreateExclusionUseCase`
3. **create_exclusions_bulk.py** - `CreateExclusionsBulkUseCase`
4. **delete_exclusion.py** - `DeleteExclusionUseCase`

#### Application Errors in `backend/src/gift_genie/application/errors.py`
```python
class ExclusionNotFoundError(Exception):
    pass

class DuplicateExclusionError(Exception):
    def __init__(self, message: str = "Exclusion already exists for this pairing"):
        super().__init__(message)

class SelfExclusionNotAllowedError(Exception):
    def __init__(self, message: str = "Cannot create exclusion where giver and receiver are the same"):
        super().__init__(message)

class ExclusionConflictsError(Exception):
    def __init__(self, conflicts: list[dict[str, str]]):
        self.conflicts = conflicts
        super().__init__("Multiple conflicts detected in bulk exclusion creation")
```

### Infrastructure Layer (To Be Created)
- `ExclusionRepositorySqlAlchemy` in `backend/src/gift_genie/infrastructure/database/repositories/exclusions.py`

### Presentation Layer (To Be Created)

#### Pydantic Models in new file `backend/src/gift_genie/presentation/api/v1/exclusions.py`

```python
class ExclusionResponse(BaseModel):
    id: str
    group_id: str
    giver_member_id: str
    receiver_member_id: str
    exclusion_type: str
    is_mutual: bool
    created_at: datetime
    created_by_user_id: str | None

class PaginatedExclusionsResponse(BaseModel):
    data: list[ExclusionResponse]
    meta: PaginationMeta

class CreateExclusionRequest(BaseModel):
    model_config = ConfigDict(extra="forbid")
    giver_member_id: str
    receiver_member_id: str
    is_mutual: bool = False

class CreateExclusionResponse(BaseModel):
    created: list[ExclusionResponse]
    mutual: bool

class ExclusionItemRequest(BaseModel):
    giver_member_id: str
    receiver_member_id: str
    is_mutual: bool = False

class CreateExclusionsBulkRequest(BaseModel):
    model_config = ConfigDict(extra="forbid")
    items: list[ExclusionItemRequest]

class CreateExclusionsBulkResponse(BaseModel):
    created: list[ExclusionResponse]
```

## 4. Response Details

### GET /api/v1/groups/{groupId}/exclusions
- **Success (200)**:
```json
{
  "data": [
    {
      "id": "uuid",
      "group_id": "uuid",
      "giver_member_id": "uuid",
      "receiver_member_id": "uuid",
      "exclusion_type": "manual",
      "is_mutual": true,
      "created_at": "2025-01-01T00:00:00Z",
      "created_by_user_id": "uuid"
    }
  ],
  "meta": {
    "total": 100,
    "page": 1,
    "page_size": 10,
    "total_pages": 10
  }
}
```

### POST /api/v1/groups/{groupId}/exclusions
- **Success (201)**:
```json
{
  "created": [
    {
      "id": "uuid",
      "group_id": "uuid",
      "giver_member_id": "uuid",
      "receiver_member_id": "uuid",
      "exclusion_type": "manual",
      "is_mutual": true,
      "created_at": "2025-01-01T00:00:00Z",
      "created_by_user_id": "uuid"
    }
  ],
  "mutual": true
}
```
Note: Returns 1 or 2 exclusions depending on `is_mutual` flag

### POST /api/v1/groups/{groupId}/exclusions/bulk
- **Success (201)**:
```json
{
  "created": [
    {
      "id": "uuid",
      "group_id": "uuid",
      "giver_member_id": "uuid",
      "receiver_member_id": "uuid",
      "exclusion_type": "manual",
      "is_mutual": false,
      "created_at": "2025-01-01T00:00:00Z",
      "created_by_user_id": "uuid"
    }
  ]
}
```

### DELETE /api/v1/groups/{groupId}/exclusions/{exclusionId}
- **Success (204)**: No content

## 5. Data Flow

### GET Flow
1. Extract and validate `groupId` from path and query parameters
2. Authenticate user via JWT cookie → extract `user_id`
3. Query group repository to verify group exists
4. Check user is admin of the group (authorization)
5. Query exclusion repository with filters (type, giver, receiver) and pagination
6. Return paginated results with metadata

### POST Flow (Single Exclusion)
1. Extract and validate `groupId` from path
2. Validate request body (giver_member_id, receiver_member_id, is_mutual)
3. Authenticate user via JWT cookie → extract `user_id`
4. Query group repository to verify group exists
5. Check user is admin of the group (authorization)
6. Validate both members exist and belong to the group
7. Check `giver_member_id != receiver_member_id` (business rule)
8. Check no duplicate exclusion exists for this pairing
9. If `is_mutual=true`:
   - Create exclusion: giver → receiver with is_mutual=true
   - Create exclusion: receiver → giver with is_mutual=true
10. If `is_mutual=false`:
   - Create exclusion: giver → receiver with is_mutual=false
11. Set `created_by_user_id` to requesting user's ID
12. Return created exclusion(s) with 201 status

### POST Flow (Bulk Exclusions)
1. Extract and validate `groupId` from path
2. Validate request body (items array)
3. Authenticate user via JWT cookie → extract `user_id`
4. Query group repository to verify group exists
5. Check user is admin of the group (authorization)
6. Validate all members in all items exist and belong to the group
7. Check no self-exclusions in items
8. Check for duplicate/conflicting exclusions (both with existing and within batch)
9. If conflicts found, return 409 with conflict details
10. Begin transaction
11. For each item, expand mutual exclusions into 2 rows
12. Create all exclusions with `created_by_user_id` set to requesting user
13. Commit transaction
14. Return all created exclusions with 201 status

### DELETE Flow
1. Extract and validate `groupId` and `exclusionId` from path
2. Authenticate user via JWT cookie → extract `user_id`
3. Query exclusion repository to verify exclusion exists
4. Verify exclusion belongs to the specified group
5. Check user is admin of the group (authorization)
6. Delete the exclusion
7. Return 204 status

## 6. Security Considerations

### Authentication
- All endpoints require valid JWT token in `access_token` httpOnly cookie
- Use existing `get_current_user` dependency from groups.py
- Return 401 with `{"code": "unauthorized"}` if token missing or invalid

### Authorization
- User must be admin of the group to perform any operation
- Check `group.admin_user_id == current_user_id`
- Return 403 with `{"code": "forbidden"}` if user is not admin
- Prevent access to exclusions from groups user doesn't own

### Input Validation
- Use Pydantic models with strict validation
- Validate all UUIDs are properly formatted
- Use `ConfigDict(extra="forbid")` to reject unknown fields
- Validate pagination: page >= 1, page_size between 1 and 100
- Validate exclusion_type matches enum values
- Validate sort parameter format

### Business Rules
- Prevent self-exclusions (giver == receiver)
- Prevent duplicate manual exclusions for same pairing
- Only manual exclusions can be created via API (historical created by system)
- Mutual exclusions must create two database rows

### Data Protection
- Use parameterized queries (SQLAlchemy ORM handles this)
- No raw SQL to prevent injection attacks
- Return appropriate error messages without leaking sensitive data
- Use database constraints (foreign keys, cascades) for data integrity

## 7. Error Handling

### Common Errors (All Endpoints)
- **401 unauthorized**: Missing or invalid JWT token
  ```json
  {"code": "unauthorized"}
  ```
- **500 server_error**: Unexpected server error
  ```json
  {"code": "server_error"}
  ```

### GET /api/v1/groups/{groupId}/exclusions
- **400 invalid_query_params**: Invalid filter or pagination parameters
  ```json
  {"code": "invalid_query_params", "errors": ["error details"]}
  ```
- **403 forbidden**: User is not admin of the group
  ```json
  {"code": "forbidden"}
  ```
- **404 group_not_found**: Group does not exist
  ```json
  {"code": "group_not_found"}
  ```

### POST /api/v1/groups/{groupId}/exclusions
- **400 invalid_payload**: Validation errors in request body
  ```json
  {"code": "invalid_payload", "field": "giver_member_id", "message": "Invalid UUID"}
  ```
- **403 forbidden**: User is not admin of the group
  ```json
  {"code": "forbidden"}
  ```
- **404 group_or_member_not_found**: Group or member doesn't exist
  ```json
  {"code": "group_or_member_not_found"}
  ```
- **409 duplicate_exclusion**: Exclusion already exists for this pairing
  ```json
  {"code": "duplicate_exclusion"}
  ```
- **409 self_exclusion_not_allowed**: Giver and receiver are the same
  ```json
  {"code": "self_exclusion_not_allowed"}
  ```

### POST /api/v1/groups/{groupId}/exclusions/bulk
- **400 invalid_payload**: Validation errors in request body
  ```json
  {"code": "invalid_payload", "message": "Items array cannot be empty"}
  ```
- **403 forbidden**: User is not admin of the group
  ```json
  {"code": "forbidden"}
  ```
- **404 group_or_member_not_found**: Group or any member doesn't exist
  ```json
  {"code": "group_or_member_not_found"}
  ```
- **409 conflicts_present**: One or more exclusions conflict
  ```json
  {
    "code": "conflicts_present",
    "details": [
      {
        "giver_member_id": "uuid",
        "receiver_member_id": "uuid",
        "reason": "duplicate"
      }
    ]
  }
  ```

### DELETE /api/v1/groups/{groupId}/exclusions/{exclusionId}
- **403 forbidden**: User is not admin of the group
  ```json
  {"code": "forbidden"}
  ```
- **404 exclusion_not_found**: Exclusion doesn't exist or doesn't belong to group
  ```json
  {"code": "exclusion_not_found"}
  ```

### Exception Mapping
In use cases, raise appropriate application errors:
- `GroupNotFoundError` → 404 group_not_found
- `ForbiddenError` → 403 forbidden
- `ExclusionNotFoundError` → 404 exclusion_not_found
- `DuplicateExclusionError` → 409 duplicate_exclusion
- `SelfExclusionNotAllowedError` → 409 self_exclusion_not_allowed
- `ExclusionConflictsError` → 409 conflicts_present
- `MemberNotFoundError` → 404 group_or_member_not_found

## 8. Performance Considerations

### Database Optimization
- Leverage existing indexes on `group_id`, `giver_member_id`, `receiver_member_id`
- Use database-level filtering and pagination for efficiency
- Consider composite index on (group_id, exclusion_type) for filtered queries
- Use eager loading to avoid N+1 queries when fetching related data

### Bulk Operations
- Wrap bulk creation in a single database transaction
- Validate all items before starting database operations
- Consider batch size limits (e.g., max 100 items per bulk request)
- Return early on validation errors to avoid unnecessary processing

### Caching
- Results can be cached at application level (not in scope for MVP)
- Invalidate cache on POST/DELETE operations

### Query Optimization
- Use SQLAlchemy query filters efficiently
- Limit result set with pagination
- Use `COUNT(*)` query separately for total count

## 9. Implementation Steps

### Phase 1: Domain and Application Layer

1. **Add Application Errors** (`backend/src/gift_genie/application/errors.py`)
   - Add `ExclusionNotFoundError`
   - Add `DuplicateExclusionError`
   - Add `SelfExclusionNotAllowedError`
   - Add `ExclusionConflictsError` with conflicts list attribute

2. **Create Repository Interface** (`backend/src/gift_genie/domain/interfaces/repositories.py`)
   - Add `ExclusionRepository` protocol with methods:
     - `list_by_group(group_id, type, giver_member_id, receiver_member_id, page, page_size, sort) -> tuple[list[Exclusion], int]`
     - `create(exclusion: Exclusion) -> Exclusion`
     - `create_many(exclusions: list[Exclusion]) -> list[Exclusion]`
     - `get_by_id(exclusion_id: str) -> Exclusion | None`
     - `get_by_group_and_id(group_id: str, exclusion_id: str) -> Exclusion | None`
     - `exists_for_pair(group_id: str, giver_member_id: str, receiver_member_id: str) -> bool`
     - `check_conflicts_bulk(group_id: str, pairs: list[tuple[str, str]]) -> list[dict]`
     - `delete(exclusion_id: str) -> None`

3. **Create Application DTOs** (`backend/src/gift_genie/application/dto/`)
   - Create `list_exclusions_query.py` with `ListExclusionsQuery` dataclass
   - Create `create_exclusion_command.py` with `CreateExclusionCommand` dataclass
   - Create `create_exclusions_bulk_command.py` with `ExclusionItem` and `CreateExclusionsBulkCommand` dataclasses
   - Create `delete_exclusion_command.py` with `DeleteExclusionCommand` dataclass
   - Add to `__init__.py`

4. **Create Use Cases** (`backend/src/gift_genie/application/use_cases/`)
   
   - **list_exclusions.py**: `ListExclusionsUseCase`
     - Validate group exists
     - Check user authorization (admin)
     - Query exclusions with filters
     - Return paginated results
   
   - **create_exclusion.py**: `CreateExclusionUseCase`
     - Validate group exists and user is admin
     - Validate both members exist in group
     - Check no self-exclusion
     - Check no duplicate exclusion
     - Create 1 or 2 exclusions based on is_mutual
     - Return created exclusions
   
   - **create_exclusions_bulk.py**: `CreateExclusionsBulkUseCase`
     - Validate group exists and user is admin
     - Validate all members exist in group
     - Check no self-exclusions
     - Check for conflicts (duplicates, existing)
     - If conflicts, raise ExclusionConflictsError with details
     - Create all exclusions in transaction
     - Return created exclusions
   
   - **delete_exclusion.py**: `DeleteExclusionUseCase`
     - Validate exclusion exists and belongs to group
     - Check user is admin of group
     - Delete exclusion
   
   - Add to `__init__.py`

### Phase 2: Infrastructure Layer

5. **Create Repository Implementation** (`backend/src/gift_genie/infrastructure/database/repositories/exclusions.py`)
   - Create `ExclusionRepositorySqlAlchemy` class
   - Implement all methods from `ExclusionRepository` protocol
   - Use SQLAlchemy async queries
   - Handle filtering, pagination, and sorting
   - Implement conflict detection for bulk operations
   - Map database models to domain entities and vice versa

6. **Update Database Models** (if needed)
   - Verify `ExclusionModel` in `backend/src/gift_genie/infrastructure/database/models/exclusion.py` is complete
   - Ensure relationships are properly defined
   - Verify indexes exist for performance

### Phase 3: Presentation Layer

7. **Create API Router** (`backend/src/gift_genie/presentation/api/v1/exclusions.py`)
   
   - Import dependencies and models
   - Reuse `get_current_user` dependency
   - Create `get_exclusion_repository` dependency
   
   - **GET /api/v1/groups/{groupId}/exclusions**
     - Define query parameters with validation
     - Call `ListExclusionsUseCase`
     - Map to `PaginatedExclusionsResponse`
     - Handle errors with appropriate status codes
   
   - **POST /api/v1/groups/{groupId}/exclusions**
     - Define `CreateExclusionRequest` Pydantic model
     - Validate request body
     - Call `CreateExclusionUseCase`
     - Map to `CreateExclusionResponse`
     - Return 201 status
     - Handle errors
   
   - **POST /api/v1/groups/{groupId}/exclusions/bulk**
     - Define `CreateExclusionsBulkRequest` Pydantic model
     - Validate request body
     - Call `CreateExclusionsBulkUseCase`
     - Map to `CreateExclusionsBulkResponse`
     - Return 201 status
     - Handle conflicts error specially with details
   
   - **DELETE /api/v1/groups/{groupId}/exclusions/{exclusionId}**
     - Extract path parameters
     - Call `DeleteExclusionUseCase`
     - Return 204 status
     - Handle errors

8. **Register Router** (`backend/src/gift_genie/presentation/api/v1/__init__.py`)
   - Import exclusions router
   - Include in API router

9. **Update Main Application** (`backend/src/gift_genie/main.py`)
   - Verify v1 router is included (should already be done)

### Phase 4: Testing

10. **Write Unit Tests** (`backend/tests/`)
    - `test_exclusion_repository_sqlalchemy.py` - Repository tests
    - `test_list_exclusions_use_case.py` - List use case tests
    - `test_create_exclusion_use_case.py` - Create use case tests
    - `test_create_exclusions_bulk_use_case.py` - Bulk create use case tests
    - `test_delete_exclusion_use_case.py` - Delete use case tests

11. **Write Integration Tests** (`backend/tests/`)
    - `test_exclusions_api.py` - Test all four endpoints
      - Test successful operations
      - Test authentication/authorization
      - Test validation errors
      - Test conflict scenarios
      - Test pagination and filtering
      - Test mutual exclusion creation

12. **Write E2E Tests with Hurl** (`hurl/`)
    - `exclusions_list.hurl` - Test GET endpoint
    - `exclusions_create.hurl` - Test POST endpoint
    - `exclusions_bulk.hurl` - Test bulk POST endpoint
    - `exclusions_delete.hurl` - Test DELETE endpoint
    - `exclusions_authorization.hurl` - Test authorization scenarios

### Phase 5: Documentation and Validation

13. **Update API Documentation**
    - Verify OpenAPI schema is auto-generated correctly
    - Add endpoint descriptions and examples
    - Document error responses

14. **Manual Testing**
    - Test all endpoints with valid and invalid data
    - Verify error messages are user-friendly
    - Test edge cases (empty lists, large bulk operations)
    - Verify pagination works correctly
    - Test filtering combinations

15. **Code Review Checklist**
    - Clean Architecture layers properly separated
    - Error handling is comprehensive
    - Security checks in place (authentication, authorization)
    - Input validation is strict
    - Database queries are optimized
    - Tests provide good coverage
    - Code follows project conventions (type hints, formatting)

## 10. Additional Notes

### Mutual Exclusions
When `is_mutual=true`, the system creates TWO rows:
1. Row 1: giver_member_id=A, receiver_member_id=B, is_mutual=true
2. Row 2: giver_member_id=B, receiver_member_id=A, is_mutual=true

Both rows are returned in the response.

### Historical Exclusions
- Cannot be created via API (system-generated only)
- Can be listed via GET endpoint with filter
- Cannot be deleted via API (system-managed)
- `created_by_user_id` is null for historical exclusions

### Sorting
Default sort is by `exclusion_type,name`. Implementation should:
- Sort by exclusion_type first (manual before historical)
- Then by member names (requires joins to members table)
- Support ascending/descending with `-` prefix

### Transaction Management
- Bulk operations must be atomic (all or nothing)
- Use SQLAlchemy session transaction handling
- Rollback on any error during bulk creation

### Future Enhancements (Out of Scope)
- Batch edit/update exclusions
- Export exclusions to CSV
- Import exclusions from CSV
- Exclusion templates
- Undo exclusion deletion
- Audit log for exclusion changes
