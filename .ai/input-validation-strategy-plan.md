# Input Validation Strategy Plan

## Problem Statement

Current validation approach lacks consistency across the application:

1. **Scattered validation**: Some validation at infrastructure layer, some implicit, some missing
2. **Wrong error responses**: Invalid inputs can cause 500 errors instead of 400/422
3. **Inconsistent validation**: No clear pattern for where validation happens
4. **Missing validation**: Some endpoints may lack proper input validation
5. **Business vs. format validation**: Unclear separation between format validation and business rule validation

## Goal

Establish clear, consistent input validation throughout the application following clean architecture principles.

## Architecture Principles

1. **Presentation layer**: 
   - Validates all input format/structure (types, formats, ranges)
   - Returns 400/422 for invalid input format
   - Converts external formats to domain types

2. **Application layer**: 
   - Validates business rules (e.g., "user can only access their own groups")
   - Returns 403 for authorization failures, 404 for not found, 409 for conflicts
   - Assumes inputs are well-formed

3. **Domain layer**: 
   - Encapsulates business rules in entities
   - May raise domain exceptions for invariant violations
   - Uses simple, serialization-friendly types

4. **Infrastructure layer**: 
   - No validation - trusts application layer
   - Handles technical conversions only

## Validation Categories

### 1. Format Validation (Presentation Layer)

**What to validate:**
- UUID format
- Email format
- String lengths (min/max)
- Numeric ranges
- Enum values
- Required vs. optional fields
- Array sizes
- Date/time formats
- Pattern matching (regex)

**Tools:**
- FastAPI `Path()`, `Query()`, `Body()` parameters
- Pydantic models with Field validators
- Custom Pydantic validators
- Python type hints (FastAPI auto-validates)

**HTTP status codes:**
- `422 Unprocessable Entity` - Invalid format (FastAPI default)
- `400 Bad Request` - Custom validation failures

### 2. Business Rule Validation (Application Layer)

**What to validate:**
- User authorization ("is this user allowed?")
- Resource existence ("does this group exist?")
- State transitions ("can we start a draw now?")
- Business constraints ("minimum 3 members for draw")
- Data relationships ("is this member in this group?")
- Uniqueness (when not enforced by DB)

**Tools:**
- Use case logic
- Custom application exceptions
- Repository queries

**HTTP status codes:**
- `403 Forbidden` - Authorization failure
- `404 Not Found` - Resource doesn't exist
- `409 Conflict` - Business rule violation
- `422 Unprocessable Entity` - Invalid state transition

### 3. Domain Invariants (Domain Layer)

**What to validate:**
- Entity creation rules
- State consistency
- Domain-specific constraints

**Tools:**
- Entity constructors
- Entity methods
- Domain exceptions

## Implementation Plan

### Phase 1: Audit Current Validation

**Task:** Document where validation currently exists

**Files to review:**
- All API endpoints: `backend/src/gift_genie/presentation/api/v1/*.py`
- All DTOs: `backend/src/gift_genie/application/dto/*.py`
- All use cases: `backend/src/gift_genie/application/use_cases/*.py`
- All repositories: `backend/src/gift_genie/infrastructure/database/repositories/*.py`

**Create validation audit document:**
```markdown
# Validation Audit

## Auth Endpoints
- POST /register: [what's validated where]
- POST /login: [what's validated where]

## Groups Endpoints
- GET /groups: [what's validated where]
- POST /groups: [what's validated where]
- ...
```

### Phase 2: Define Validation Standards

**Create:** `backend/src/gift_genie/libs/validation.py`

```python
from typing import Annotated
from uuid import UUID
from pydantic import AfterValidator, BeforeValidator, Field

def validate_uuid_string(v: str) -> str:
    try:
        UUID(v)
        return v
    except ValueError:
        raise ValueError("Invalid UUID format")

UUIDStr = Annotated[str, AfterValidator(validate_uuid_string)]

def validate_non_empty_string(v: str) -> str:
    if not v or not v.strip():
        raise ValueError("String cannot be empty")
    return v.strip()

NonEmptyStr = Annotated[str, AfterValidator(validate_non_empty_string)]

# Add more common validators
```

**Create:** `backend/src/gift_genie/application/errors.py` (expand existing)

```python
class ValidationError(ApplicationError):
    """Business rule validation failed"""
    pass

class AuthorizationError(ApplicationError):
    """User not authorized for operation"""
    pass

class ConflictError(ApplicationError):
    """Operation conflicts with current state"""
    pass
```

### Phase 3: Presentation Layer Validation

**For each endpoint:**

1. **Path parameters:**
   ```python
   from uuid import UUID
   from fastapi import Path
   
   @router.get("/groups/{group_id}")
   async def get_group(
       group_id: UUID = Path(..., description="Group UUID"),
       current_user_id: str = Depends(get_current_user_id)
   ):
       # group_id validated by FastAPI
       result = await use_case(str(group_id), current_user_id)
   ```

2. **Query parameters:**
   ```python
   from typing import Annotated
   from fastapi import Query
   
   @router.get("/groups")
   async def list_groups(
       limit: Annotated[int, Query(ge=1, le=100)] = 10,
       offset: Annotated[int, Query(ge=0)] = 0,
       current_user_id: str = Depends(get_current_user_id)
   ):
       # limit and offset validated by FastAPI
   ```

3. **Request bodies (DTOs):**
   ```python
   from pydantic import BaseModel, Field, field_validator
   
   class CreateGroupRequest(BaseModel):
       name: str = Field(..., min_length=1, max_length=100)
       description: str | None = Field(None, max_length=500)
       
       @field_validator('name')
       @classmethod
       def name_not_empty(cls, v: str) -> str:
           if not v.strip():
               raise ValueError('Name cannot be empty or whitespace')
           return v.strip()
   ```

4. **Error handling:**
   ```python
   from fastapi import HTTPException, status
   from gift_genie.application.errors import (
       AuthorizationError,
       ValidationError,
       ConflictError
   )
   
   @router.post("/groups")
   async def create_group(request: CreateGroupRequest, ...):
       try:
           result = await use_case(...)
           return result
       except AuthorizationError as e:
           raise HTTPException(status.HTTP_403_FORBIDDEN, str(e))
       except ValidationError as e:
           raise HTTPException(status.HTTP_422_UNPROCESSABLE_ENTITY, str(e))
       except ConflictError as e:
           raise HTTPException(status.HTTP_409_CONFLICT, str(e))
   ```

**Files to update:**
- `backend/src/gift_genie/presentation/api/v1/auth.py`
- `backend/src/gift_genie/presentation/api/v1/groups.py`
- `backend/src/gift_genie/presentation/api/v1/group_detail.py`
- `backend/src/gift_genie/presentation/api/v1/members.py`
- `backend/src/gift_genie/presentation/api/v1/exclusions.py`
- `backend/src/gift_genie/presentation/api/v1/draws.py` (if exists)
- `backend/src/gift_genie/presentation/api/v1/assignments.py` (if exists)

### Phase 4: Application Layer Validation

**For each use case:**

1. **Business rule validation:**
   ```python
   from gift_genie.application.errors import ValidationError, AuthorizationError
   
   async def create_exclusion(command: CreateExclusionCommand) -> Exclusion:
       # Check authorization
       group = await group_repo.get_by_id(command.group_id)
       if not group or group.created_by != command.user_id:
           raise AuthorizationError("Cannot modify this group")
       
       # Check business rules
       if command.excluder_id == command.excluded_id:
           raise ValidationError("Member cannot exclude themselves")
       
       # Check existence
       excluder = await member_repo.get_by_id(command.excluder_id)
       if not excluder:
           raise ValidationError("Excluder member not found")
   ```

2. **Convert presentation exceptions:**
   - Remove `HTTPException` from use cases
   - Raise domain/application exceptions
   - Let presentation layer convert to HTTP codes

**Files to update:**
- All files in `backend/src/gift_genie/application/use_cases/*.py`

### Phase 5: Repository Layer Cleanup

**For each repository:**

1. **Remove validation logic:**
   ```python
   async def get_by_id(self, exclusion_id: str) -> Exclusion | None:
       # UUID format validated at presentation layer
       stmt = select(ExclusionModel).where(
           ExclusionModel.id == UUID(exclusion_id)
       )
       # No try/except - trust the input
   ```

2. **Keep only technical conversions:**
   - `str` → `UUID` for database queries
   - Domain entities → DB models
   - DB models → Domain entities

**Files to update:**
- `backend/src/gift_genie/infrastructure/database/repositories/*.py`

### Phase 6: Comprehensive Testing

**Test categories:**

1. **API validation tests:**
   ```python
   # Test format validation (422)
   async def test_invalid_uuid_returns_422(client):
       response = await client.get("/api/v1/groups/not-a-uuid")
       assert response.status_code == 422
   
   async def test_empty_group_name_returns_422(client):
       response = await client.post("/api/v1/groups", json={"name": ""})
       assert response.status_code == 422
   
   # Test business validation (403, 404, 409)
   async def test_unauthorized_access_returns_403(client):
       # Try to access another user's group
       assert response.status_code == 403
   
   async def test_nonexistent_resource_returns_404(client):
       valid_uuid = str(uuid4())
       response = await client.get(f"/api/v1/groups/{valid_uuid}")
       assert response.status_code == 404
   ```

2. **Create comprehensive test file:**
   - `backend/tests/test_input_validation.py` - Format validation
   - `backend/tests/test_business_rules.py` - Business validation
   - `backend/tests/test_authorization.py` - Auth checks

3. **Update existing tests:**
   - Verify they still pass
   - Add missing validation test cases
   - Ensure proper status codes

### Phase 7: Documentation

**Update documentation files:**

1. **`.ai/rules/api-docs.md`:**
   ```markdown
   ## Input Validation
   
   ### Format Validation (Presentation Layer)
   - All format validation happens at API endpoints
   - FastAPI validates types, UUIDs, ranges automatically
   - Invalid format returns 422 with detailed error messages
   - Use Pydantic validators for complex validation
   
   ### Business Validation (Application Layer)
   - Business rules validated in use cases
   - Authorization: 403 Forbidden
   - Not found: 404 Not Found
   - Conflicts: 409 Conflict
   - Invalid state: 422 Unprocessable Entity
   
   ### Examples
   [Add examples]
   ```

2. **`.ai/rules/architecture.md`:**
   ```markdown
   ## Validation Responsibilities
   
   ### Presentation Layer
   - Format/structure validation
   - Type checking
   - Range validation
   - Pattern matching
   Returns: 400/422 for invalid input
   
   ### Application Layer
   - Business rule validation
   - Authorization checks
   - State validation
   Returns: 403/404/409/422 via custom exceptions
   
   ### Domain Layer
   - Entity invariants
   - Core business rules
   Raises: Domain exceptions
   
   ### Infrastructure Layer
   - No validation
   - Technical conversions only
   ```

3. **Create new guide:** `.ai/rules/validation.md`
   - Complete validation guide
   - Examples for each category
   - Common patterns
   - Testing strategies

## Migration Checklist

### Phase 1: Audit
- [ ] Audit all API endpoints for current validation
- [ ] Audit all use cases for validation logic
- [ ] Audit all repositories for validation logic
- [ ] Document findings in validation audit file

### Phase 2: Standards
- [ ] Create `libs/validation.py` with common validators
- [ ] Expand `application/errors.py` with validation exceptions
- [ ] Define error→HTTP status code mapping
- [ ] Create validation patterns document

### Phase 3: Presentation Layer
- [ ] Update auth endpoints
- [ ] Update groups endpoints
- [ ] Update group_detail endpoints
- [ ] Update members endpoints
- [ ] Update exclusions endpoints
- [ ] Update draws endpoints (if exists)
- [ ] Update assignments endpoints (if exists)
- [ ] Add error handling middleware/decorator

### Phase 4: Application Layer
- [ ] Update all use cases to use application exceptions
- [ ] Remove HTTPException from use cases
- [ ] Add business rule validation where missing
- [ ] Add authorization checks where missing

### Phase 5: Repository Layer
- [ ] Remove validation from all repositories
- [ ] Add comments about validation responsibility
- [ ] Keep only technical conversions

### Phase 6: Testing
- [ ] Create `test_input_validation.py`
- [ ] Create `test_business_rules.py`
- [ ] Create `test_authorization.py`
- [ ] Update existing API tests
- [ ] Update existing use case tests
- [ ] Run full test suite: `make test`
- [ ] Achieve >90% coverage on validation logic

### Phase 7: Documentation
- [ ] Update `.ai/rules/api-docs.md`
- [ ] Update `.ai/rules/architecture.md`
- [ ] Create `.ai/rules/validation.md`
- [ ] Add validation examples to README
- [ ] Document common validation patterns

### Phase 8: Manual Testing
- [ ] Test all endpoints with invalid format inputs
- [ ] Test business rule violations
- [ ] Test authorization failures
- [ ] Verify correct HTTP status codes
- [ ] Verify error message quality
- [ ] Create Hurl test scripts for validation scenarios

## Benefits

1. **Consistency**: Clear pattern for where validation happens
2. **Correct HTTP codes**: 422 for format, 403 for auth, 409 for conflicts
3. **Better error messages**: Detailed, actionable feedback
4. **Cleaner code**: Each layer has clear responsibility
5. **Easier testing**: Validation logic isolated and testable
6. **Type safety**: FastAPI + Pydantic validate at runtime
7. **Maintainability**: New features follow established pattern

## Validation Examples by Endpoint

### POST /api/v1/auth/register
- **Format**: email format, password length, name length (Presentation)
- **Business**: email uniqueness (Application)

### POST /api/v1/groups
- **Format**: name length, description length (Presentation)
- **Business**: user authenticated (Application)

### DELETE /api/v1/groups/{group_id}
- **Format**: group_id is valid UUID (Presentation)
- **Business**: group exists, user owns group (Application)

### POST /api/v1/groups/{group_id}/members
- **Format**: UUID format, name length (Presentation)
- **Business**: group exists, user owns group, no duplicate names (Application)

### POST /api/v1/groups/{group_id}/exclusions
- **Format**: UUID formats (Presentation)
- **Business**: group exists, user owns group, members exist, not self-exclusion (Application)

### POST /api/v1/groups/{group_id}/draw
- **Format**: UUID format (Presentation)
- **Business**: group exists, user owns group, minimum members, no active draw, all exclusions valid (Application)

## Rollback Plan

If issues arise:
1. **Phase 3 rollback**: Revert API changes to accept strings, restore old validation
2. **Phase 4 rollback**: Restore HTTPException in use cases
3. **Phase 5 rollback**: No changes needed (repositories already safe)
4. No database changes in any phase

## Future Considerations

1. **Validation middleware**: Centralized error handling
2. **OpenAPI schema**: Auto-generate validation from schema
3. **Client-side validation**: Share validation rules with frontend
4. **Validation metrics**: Track validation failures for insights
5. **Custom error responses**: Standardized error format across all endpoints
