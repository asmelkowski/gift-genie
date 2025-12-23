# Permission Validation Fix - Implementation Plan

## Problem Summary

**Issue**: Admins cannot grant group-specific permissions through the UI, receiving 404 errors like:
```json
{"detail":{"code":"not_found","message":"Permission 'groups:read:a097232b-956a-4384-a014-f4e0748076ab' not found"}}
```

**Root Cause**: There are two different code paths for granting permissions with inconsistent validation:

1. **System auto-grant path** (when users create groups):
   - Uses `grant_permissions_bulk()`
   - Directly inserts resource-scoped permissions (e.g., `groups:read:UUID`)
   - No validation against `permissions` table
   - ✅ Works perfectly

2. **Admin UI path** (when admins manually grant permissions):
   - Uses `GrantPermissionUseCase`
   - Validates that exact permission code exists in `permissions` table
   - ❌ Fails because resource-scoped permissions aren't in `permissions` table

## Technical Background

### Current System Behavior

- **Permission Registry** (`permission_registry.py`): Defines base permissions like `groups:read`, `groups:update`, `groups:delete`
- **Permissions Table**: Contains only base permissions from the registry
- **User Permissions Table**: Contains both base permissions AND resource-scoped permissions like `groups:read:UUID`
- **Auto-grant on Group Creation**: When a user creates a group, the system automatically grants 14 resource-scoped permissions via `build_group_owner_permissions(group_id)`

### The Architectural Design

The system uses **resource-scoped permissions** following the pattern:
- **Base format**: `resource:action` (e.g., `groups:read`)
- **Resource-scoped format**: `resource:action:resource_id` (e.g., `groups:read:550e8400-e29b-41d4-a716-446655440000`)

This is intentional and follows industry best practices (AWS IAM, Kubernetes RBAC, etc.).

## Solution Overview

**Strategy**: Make the admin grant flow consistent with the system auto-grant flow by implementing pattern-based validation instead of requiring exact permission matches.

### Key Principles

1. **Base permissions live in `permissions` table**: These provide metadata (name, description, category)
2. **Resource-scoped permissions are dynamic**: They don't need database entries
3. **Validation checks the base permission exists**: For `groups:read:UUID`, we validate that `groups:read` exists
4. **Resource existence is verified**: We check that the UUID refers to an actual resource
5. **Backward compatibility maintained**: Existing non-scoped permissions work exactly as before

## Implementation Plan

### Phase 1: Create Permission Pattern Validator Service

**File**: `backend/src/gift_genie/domain/services/permission_validator.py`

**Purpose**: Centralized service to validate permission codes, supporting both base and resource-scoped permissions.

**Key Responsibilities**:
1. Parse permission codes into components (resource, action, resource_id)
2. Validate permission patterns against registry
3. Verify base permission exists in permissions table
4. Validate resource ID format (UUID)
5. Verify resource exists in appropriate table (groups, draws, members, exclusions)

**Interface**:
```python
@dataclass
class PermissionValidationResult:
    is_valid: bool
    base_permission_code: str  # e.g., "groups:read"
    resource_id: str | None    # e.g., "550e8400-..."
    error_message: str | None

class PermissionValidator:
    async def validate_permission_code(
        self,
        permission_code: str
    ) -> PermissionValidationResult:
        """
        Validates a permission code.

        For base permissions (e.g., "groups:read"):
        - Checks if exists in permissions table

        For resource-scoped (e.g., "groups:read:uuid"):
        - Checks if base permission exists in permissions table
        - Validates UUID format
        - Verifies resource exists in appropriate table
        """
```

**Implementation Details**:
- Split permission code by `:` separator
- 2 parts = base permission (e.g., `groups:read`)
- 3 parts = resource-scoped (e.g., `groups:read:uuid`)
- Validate UUID format using regex or `uuid.UUID()`
- Map resource type to repository:
  - `groups` → GroupRepository
  - `members` → MemberRepository
  - `draws` → DrawRepository
  - `exclusions` → ExclusionRepository
- Check resource exists using repository

**Edge Cases to Handle**:
- Empty or None permission codes
- Malformed codes (less than 2 parts)
- Invalid UUID format
- Non-existent resources
- Permissions that shouldn't be resource-scoped (e.g., `admin:view_dashboard:uuid` is invalid)

### Phase 2: Update GrantPermissionUseCase

**File**: `backend/src/gift_genie/application/use_cases/grant_permission.py`

**Current Code (lines 57-60)**:
```python
# 3. Verify permission exists
permission = await self.permission_repository.get_by_code(command.permission_code)
if not permission:
    raise NotFoundError(f"Permission '{command.permission_code}' not found")
```

**New Code**:
```python
# 3. Validate permission code
validation_result = await self.permission_validator.validate_permission_code(
    command.permission_code
)
if not validation_result.is_valid:
    raise NotFoundError(
        f"Permission '{command.permission_code}' not found: {validation_result.error_message}"
    )
```

**Changes Required**:
1. Add `permission_validator: PermissionValidator` to dataclass fields
2. Update `execute()` method to use validator instead of direct repository lookup
3. Remove direct permission lookup (no longer needed for validation)
4. Keep all other logic unchanged (idempotency, user checks, etc.)

### Phase 3: Update UserPermissionRepository.list_permissions_for_user

**File**: `backend/src/gift_genie/infrastructure/database/repositories/user_permissions.py`

**Problem**: Current implementation (lines 105-119) joins with `permissions` table, which fails for resource-scoped permissions that don't have entries there.

**Current Code**:
```python
async def list_permissions_for_user(self, user_id: str) -> list[Permission]:
    stmt = (
        select(PermissionModel)
        .select_from(UserPermissionModel)
        .join(PermissionModel, PermissionModel.code == UserPermissionModel.permission_code)
        .where(UserPermissionModel.user_id == UUID(user_id))
    )
    # ... returns Permission entities from join
```

**New Approach**:
1. Fetch all `UserPermissionModel` records for the user
2. For each permission code:
   - Parse to extract base permission
   - Look up base permission in `permissions` table
   - If resource-scoped, synthesize a new Permission entity with:
     - Full code (with resource ID)
     - Metadata from base permission (name, description, category)
     - Annotated name showing resource scope

**New Code Structure**:
```python
async def list_permissions_for_user(self, user_id: str) -> list[Permission]:
    # 1. Get all user permission grants
    stmt = select(UserPermissionModel).where(UserPermissionModel.user_id == UUID(user_id))
    res = await self._session.execute(stmt)
    user_perm_models = res.scalars().all()

    # 2. For each permission, resolve base permission and synthesize if needed
    permissions = []
    for user_perm in user_perm_models:
        perm_code = user_perm.permission_code

        # Try direct lookup first (for non-scoped permissions)
        stmt = select(PermissionModel).where(PermissionModel.code == perm_code)
        res = await self._session.execute(stmt)
        perm_model = res.scalar_one_or_none()

        if perm_model:
            # Found direct match - use it as-is
            permissions.append(self._permission_to_domain(perm_model))
        else:
            # Resource-scoped permission - synthesize from base
            base_code = self._extract_base_permission(perm_code)
            stmt = select(PermissionModel).where(PermissionModel.code == base_code)
            res = await self._session.execute(stmt)
            base_perm_model = res.scalar_one_or_none()

            if base_perm_model:
                # Create synthetic permission with full code
                synthetic = Permission(
                    code=perm_code,  # Full code with resource ID
                    name=base_perm_model.name,
                    description=base_perm_model.description,
                    category=base_perm_model.category,
                    created_at=base_perm_model.created_at
                )
                permissions.append(synthetic)

    return permissions

def _extract_base_permission(self, permission_code: str) -> str:
    """Extract base permission from resource-scoped code."""
    parts = permission_code.split(':')
    if len(parts) >= 3:
        return f"{parts[0]}:{parts[1]}"
    return permission_code
```

**Optimization Consideration**:
- Could batch load all base permissions in a single query
- For now, individual lookups are acceptable given typical permission counts

### Phase 4: Add Unit Tests

**File**: `backend/tests/test_permission_validator.py` (new file)

**Test Cases**:
1. **Validate base permissions**:
   - Valid base permission (exists in table) → Success
   - Invalid base permission (doesn't exist) → Failure

2. **Validate resource-scoped permissions**:
   - Valid format with existing resource → Success
   - Valid format with non-existent resource → Failure
   - Invalid UUID format → Failure
   - Base permission doesn't exist → Failure

3. **Edge cases**:
   - Empty permission code → Failure
   - Malformed code (1 part) → Failure
   - Permission with 4+ parts → Handle gracefully
   - Non-scopable permission with resource ID → Failure (e.g., `admin:view_dashboard:uuid`)

4. **All resource types**:
   - Test with groups, members, draws, exclusions
   - Verify correct repository is called for each type

**File**: `backend/tests/test_grant_permission_updated.py`

**Test Cases**:
1. **Grant base permission** (existing behavior):
   - Admin grants `groups:read` → Success

2. **Grant resource-scoped permission**:
   - Admin grants `groups:read:valid-uuid` where group exists → Success
   - Admin grants `groups:read:invalid-uuid` → Failure (404, invalid UUID)
   - Admin grants `groups:read:valid-uuid` where group doesn't exist → Failure (404, resource not found)
   - Admin grants `invalid:action:valid-uuid` → Failure (404, base permission not found)

3. **Idempotency**:
   - Grant same resource-scoped permission twice → Returns existing grant

### Phase 5: Update Integration/E2E Tests

**File**: Review existing E2E tests in `frontend/e2e/admin/permission-management.spec.ts`

**Verify**:
- Tests already grant group-specific permissions via API
- Tests should now pass with the fix
- May need to update expectations if error messages changed

## Implementation Order

### Step 1: Create PermissionValidator Service
- [ ] Create `domain/services/permission_validator.py`
- [ ] Implement `PermissionValidationResult` dataclass
- [ ] Implement `PermissionValidator` class
- [ ] Add helper methods for parsing and UUID validation

### Step 2: Update GrantPermissionUseCase
- [ ] Add `permission_validator` dependency
- [ ] Replace direct permission lookup with validator call
- [ ] Update error messages
- [ ] Ensure backward compatibility

### Step 3: Update UserPermissionRepository
- [ ] Modify `list_permissions_for_user` method
- [ ] Add `_extract_base_permission` helper
- [ ] Test with both scoped and non-scoped permissions

### Step 4: Write Tests
- [ ] Create `test_permission_validator.py`
- [ ] Update `test_grant_permission.py`
- [ ] Run all existing tests to ensure no regressions

### Step 5: Manual Testing
- [ ] Test granting group-specific permissions via admin UI
- [ ] Test listing user permissions with mixed scoped/non-scoped
- [ ] Test all resource types (groups, members, draws, exclusions)
- [ ] Verify error messages are clear and helpful

### Step 6: Update Dependencies
- [ ] Update API endpoints to inject PermissionValidator
- [ ] Update dependency injection in `presentation/api/v1/admin.py`

## Expected Outcomes

### After Implementation

1. **Admins can grant resource-scoped permissions** through the UI without errors
2. **Permission validation is consistent** across all code paths (auto-grant and manual grant)
3. **System maintains security** by verifying resources exist before granting permissions
4. **Backward compatibility** - all existing permissions continue to work
5. **Clear error messages** help admins understand validation failures

### Error Message Examples

**Before**:
```
Permission 'groups:read:a097232b-956a-4384-a014-f4e0748076ab' not found
```

**After (various scenarios)**:
```
Permission 'groups:read:invalid-uuid' not found: Invalid resource ID format
Permission 'groups:read:a097232b-956a-4384-a014-f4e0748076ab' not found: Group not found
Permission 'invalid:action:a097232b-956a-4384-a014-f4e0748076ab' not found: Base permission 'invalid:action' does not exist
```

## Risk Assessment

### Low Risk
- Changes are isolated to permission validation logic
- Existing auto-grant flow unchanged (continues to use `grant_permissions_bulk`)
- All existing tests should continue to pass
- New validation is stricter and more secure (validates resources exist)

### Mitigation Strategies
- Comprehensive unit tests before integration
- Manual testing with real database
- Gradual rollout (can feature-flag if needed)
- Easy rollback (just revert the GrantPermissionUseCase changes)

## Future Enhancements

### Not in Scope for This Fix
1. **Permission metadata for resource-scoped permissions**: Could store friendly names like "Read Group: Holiday Gift Exchange"
2. **Batch validation**: Optimize when validating many permissions at once
3. **Caching**: Cache base permission lookups to reduce DB queries
4. **Authorization enforcement**: Review all authorization checks to ensure they handle resource-scoped permissions correctly
5. **Audit logging**: Log when resource-scoped permissions are granted with resource details

### Post-Implementation Review Items
1. Review authorization service to ensure it properly handles resource-scoped permissions
2. Check all API endpoints that use `require_permission` decorator
3. Verify permission enforcement in use cases
4. Consider adding documentation for permission patterns

## Questions & Decisions

### Resolved
- ✅ Validate resource existence: YES (verify UUID refers to real resource)
- ✅ Scope: ALL resource types (groups, members, draws, exclusions)
- ✅ Authorization: Assumed already working (user to confirm)

### To Confirm During Implementation
- Are there any permissions that should NOT be resource-scopable? (e.g., admin permissions)
- Should we allow future resource types without code changes? (extensible design)
- Performance: Is permission validation called frequently enough to need caching?

## Success Criteria

- [ ] Admin can grant `groups:read:UUID` through the UI without errors
- [ ] Admin can grant `members:create:UUID` through the UI without errors
- [ ] Granting permission with invalid UUID returns clear error
- [ ] Granting permission for non-existent resource returns clear error
- [ ] Existing base permissions (non-scoped) continue to work
- [ ] All unit tests pass
- [ ] All integration tests pass
- [ ] E2E tests for permission management pass
- [ ] Manual testing confirms UI works end-to-end
