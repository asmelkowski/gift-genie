# Validation Audit

## Current Validation State

### Presentation Layer (API Endpoints)

#### Auth Endpoints (`auth.py`)
- **POST /register**: Format validation via Pydantic (email, password length, name length), custom password strength validation in model validator, email uniqueness (business) in use case
- **POST /login**: Format validation via Pydantic (email, password length), credentials validation (business) in use case

#### Groups Endpoints (`groups.py`)
- **GET /groups**: Query params validation (page ge=1, page_size ge=1 le=100, sort pattern), user auth validation in use case
- **POST /groups**: Request body validation (name min_length=1 max_length=100 strip_whitespace, historical_exclusions_lookback ge=1), group name length validation in use case, user auth implicit
- **GET /groups/{group_id}**: Path param `group_id` as string (no UUID validation), group existence and ownership validation in use case
- **PATCH /groups/{group_id}**: Path param as string, request body validation (name constraints, lookback ge=1), at least one field validator, group existence/ownership/name validation in use case
- **DELETE /groups/{group_id}**: Path param as string, group existence/ownership validation in use case

#### Members Endpoints (`members.py`)
- **GET /groups/{group_id}/members/{member_id}**: Path params as strings, group/member existence and ownership validation in use case
- **PATCH /groups/{group_id}/members/{member_id}**: Path params as strings, request body validation (name constraints, email format), at least one field validator, various business validations in use case
- **DELETE /groups/{group_id}/members/{member_id}**: Path params as strings, group/member existence and ownership validation in use case
- **GET /groups/{group_id}/members**: Path params as strings, query params validation (page ge=1, page_size ge=1 le=100, sort pattern), group existence/ownership validation in use case
- **POST /groups/{group_id}/members**: Path params as strings, request body validation (name constraints, email format), group existence/ownership/name uniqueness validation in use case

#### Exclusions Endpoints (`exclusions.py`)
- **GET /groups/{group_id}/exclusions**: Path param as string, query params validation (page ge=1, page_size ge=1 le=100, sort pattern), group existence/ownership validation in use case
- **POST /groups/{group_id}/exclusions**: Path param as string, request body validation (giver_member_id, receiver_member_id as strings), group/members existence, ownership, duplicate/self exclusion validation in use case
- **POST /groups/{group_id}/exclusions/bulk**: Path param as string, request body validation (array of exclusion items), complex business validation in use case
- **DELETE /groups/{group_id}/exclusions/{exclusion_id}**: Path params as strings, group/exclusion existence and ownership validation in use case

### Application Layer (Use Cases)

#### Current Validation Patterns
- **Authorization**: User ownership checks (group.admin_user_id == requesting_user_id)
- **Existence**: Entity existence checks (group = await repo.get_by_id())
- **Business Rules**: Name uniqueness, email uniqueness, self-exclusion prevention, duplicate exclusion prevention
- **Format Validation Mixed In**: Group name length validation in CreateGroupUseCase, historical_exclusions_lookback validation in UpdateGroupUseCase
- **Error Types**: Custom application exceptions (ForbiddenError, GroupNotFoundError, etc.)

#### Issues Found
- Format validation scattered between presentation and application layers
- Some use cases do format validation that should be in presentation layer
- Inconsistent validation - some endpoints validate UUID format, others don't
- HTTPException sometimes raised directly in use cases (should be converted at presentation layer)

### Infrastructure Layer (Repositories)

#### Current State
- **UUID Conversion**: String IDs converted to UUID for database queries
- **Error Handling**: IntegrityError caught and converted to ValueError
- **No Business Validation**: Pure data access layer
- **Technical Conversions**: Domain entities ↔ DB models

#### Issues Found
- UUID validation happens implicitly (UUID() constructor raises ValueError if invalid)
- No explicit validation comments or patterns

### Domain Layer

#### Current State
- **Entities**: Basic dataclasses with no validation
- **No Invariants**: Domain rules not enforced at entity level
- **Simple Types**: Using basic Python types

## Key Issues Identified

1. **Inconsistent UUID Validation**: Path parameters like `group_id`, `member_id`, `exclusion_id` are strings with no format validation at presentation layer
2. **Mixed Format/Business Validation**: Some format validation in use cases (group name length) that should be in presentation layer
3. **HTTPException in Use Cases**: Some use cases raise HTTPException directly instead of application exceptions
4. **Implicit UUID Validation**: UUID conversion in repositories happens via constructor, not explicit validation
5. **Missing Presentation Validation**: No UUID format validation, some query parameter patterns missing
6. **Inconsistent Error Handling**: Some endpoints catch ValueError for validation, others don't

## Recommended Improvements

1. **Presentation Layer**: Add UUID path parameter validation, ensure all format validation happens here
2. **Application Layer**: Move all business validation here, use only application exceptions
3. **Infrastructure Layer**: Keep UUID conversion but add validation comments
4. **Error Handling**: Consistent HTTP status code mapping from application exceptions
