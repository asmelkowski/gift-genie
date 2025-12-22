# Resource-Level Permissions Implementation Plan

## 1. Executive Summary

### Problem Statement
Users are currently receiving 403 Forbidden errors when trying to access their own groups. The existing permissions system grants broad, non-resource-scoped permissions that don't automatically provide access to resources users create. This creates a poor user experience where group creators must manually be granted permissions to manage their own groups.

### Proposed Solution
Implement a resource-level permissions system with automatic permission grants. When users create a group, they will automatically receive all necessary permissions scoped to that specific group (format: `permission_code:resource_id`). This eliminates manual permission management and provides immediate access to owned resources.

### Key Benefits
- **Improved UX**: Users immediately have access to groups they create
- **Better Security**: Permissions are scoped to specific resources, not global
- **Cleaner Authorization**: No need for special ownership checks in endpoints
- **Future-Proof**: Foundation for advanced permission features (sharing, collaboration)
- **Fresh Start**: No migration complexity since we're starting with a clean database

### Timeline Estimate
**Total: 14-17 hours** across 8 implementation phases

---

## 2. Current State Analysis

### What Already Works
- `AuthorizationService` already supports `resource_id` parameter
- Database schema (`user_permissions` table) already has `permission_code` column that can store `{resource}:{action}:{resource_id}` format
- Permission checking infrastructure is in place
- `resource_id_from_path` decorator is implemented and working

### What Needs to Change
- **No auto-grant mechanism**: Currently, no permissions are automatically granted when groups are created
- **Limited permissions**: `USER_BASIC_PERMISSIONS` only includes global `groups:create`, nothing resource-scoped
- **Manual setup required**: Tests and development require manual permission grants
- **Frontend 403 errors**: List endpoints return 403 instead of empty arrays when users lack permissions

### Fresh Database Advantage
Since we're starting with a clean database (no production data):
- **No migration needed**: Can change permission structure without data migration
- **Clean implementation**: No backward compatibility concerns
- **Easy rollback**: Can reset database and start over if needed
- **Faster development**: No need to write complex migration scripts

---

## 3. Technical Design

### 3.1 Permission Model

#### Format
```
{resource}:{action}:{resource_id}
```

#### Examples
```
groups:read:550e8400-e29b-41d4-a716-446655440000
members:create:550e8400-e29b-41d4-a716-446655440000
draws:finalize:550e8400-e29b-41d4-a716-446655440000
exclusions:delete:550e8400-e29b-41d4-a716-446655440000
```

#### Character Limits
- Resource: ~10 chars
- Action: ~20 chars
- UUID: 36 chars
- Colons: 2 chars
- **Total**: ~68 characters (well within VARCHAR(255) limit)

#### Resource Hierarchy
```
group (550e8400-e29b-41d4-a716-446655440000)
├── groups:read:550e8400-...
├── groups:update:550e8400-...
├── groups:delete:550e8400-...
├── members:read:550e8400-...      # Uses group_id, not member_id
├── members:create:550e8400-...
├── members:update:550e8400-...
├── members:delete:550e8400-...
├── draws:read:550e8400-...        # Uses group_id, not draw_id
├── draws:create:550e8400-...
├── draws:finalize:550e8400-...
├── draws:view_assignments:550e8400-...
├── exclusions:read:550e8400-...   # Uses group_id, not exclusion_id
├── exclusions:create:550e8400-...
└── exclusions:delete:550e8400-...
```

**Important Design Decision**: All child resources (members, draws, exclusions) use `group_id` for their resource_id, not their own entity IDs. This simplifies permission management and aligns with the hierarchy where group ownership implies ownership of all child resources.

### 3.2 Auto-Grant Permissions

When a user creates a group, they automatically receive these 15 permissions:

```python
GROUP_OWNER_AUTO_GRANT_PERMISSIONS = [
    # Group management (3)
    "groups:read",
    "groups:update",
    "groups:delete",

    # Member management (4)
    "members:read",
    "members:create",
    "members:update",
    "members:delete",

    # Draw management (4)
    "draws:read",
    "draws:create",
    "draws:finalize",
    "draws:view_assignments",
    # NOT: draws:notify (privileged - requires admin)

    # Exclusion management (3)
    "exclusions:read",
    "exclusions:create",
    "exclusions:delete",
]
```

**Why `draws:notify` is excluded**: Sending notifications has cost implications (email/SMS). This permission should only be granted to admins or users with verified payment methods.

**Total**: 15 permission records inserted per group creation (~50ms overhead, acceptable)

### 3.3 Database Schema

#### Current Schema (No Changes Needed!)
```sql
CREATE TABLE user_permissions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    permission_code VARCHAR(255) NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(user_id, permission_code)
);

CREATE INDEX idx_user_permissions_user_id ON user_permissions(user_id);
```

The existing schema already supports our needs:
- `permission_code` VARCHAR(255) can store `groups:read:550e8400-...` (~68 chars)
- `user_id` index enables fast lookups
- `UNIQUE(user_id, permission_code)` prevents duplicates

#### Optional Future Optimization
If performance becomes an issue (unlikely), we could add:

```sql
-- Future enhancement (not needed now)
ALTER TABLE user_permissions
    ADD COLUMN resource_id UUID;

CREATE INDEX idx_user_permissions_resource_id
    ON user_permissions(resource_id);
```

This would enable faster queries like "find all users with permissions on this group," but it's not necessary for initial implementation.

### 3.4 Frontend Permission Error Strategy

#### Problem
Currently, when users lack permissions:
- **Detail endpoints** (GET /groups/{id}): Return 403 Forbidden
- **List endpoints** (GET /groups): Return 403 Forbidden

Expected behavior:
- **Detail endpoints**: Return 404 Not Found (hide existence of resources)
- **List endpoints**: Return 200 OK with empty array (user has no accessible items)

#### Solution: Config-Based Interceptor

**File**: `frontend/src/lib/permissionErrorStrategy.ts`

```typescript
export type PermissionErrorBehavior = 'show-404' | 'show-empty' | 'show-forbidden';

export interface EndpointPermissionConfig {
  pattern: RegExp;
  behavior: PermissionErrorBehavior;
}

export const permissionErrorConfig: EndpointPermissionConfig[] = [
  // Detail endpoints: 403 -> 404
  { pattern: /^\/api\/v1\/groups\/[^\/]+$/, behavior: 'show-404' },
  { pattern: /^\/api\/v1\/groups\/[^\/]+\/members\/[^\/]+$/, behavior: 'show-404' },
  { pattern: /^\/api\/v1\/groups\/[^\/]+\/draws\/[^\/]+$/, behavior: 'show-404' },

  // List endpoints: 403 -> empty array
  { pattern: /^\/api\/v1\/groups$/, behavior: 'show-empty' },
  { pattern: /^\/api\/v1\/groups\/[^\/]+\/members$/, behavior: 'show-empty' },
  { pattern: /^\/api\/v1\/groups\/[^\/]+\/draws$/, behavior: 'show-empty' },
  { pattern: /^\/api\/v1\/groups\/[^\/]+\/exclusions$/, behavior: 'show-empty' },

  // Admin endpoints: 403 -> 403 (show actual forbidden error)
  { pattern: /^\/api\/v1\/admin\/.*/, behavior: 'show-forbidden' },
];

export function getPermissionErrorBehavior(url: string): PermissionErrorBehavior {
  for (const config of permissionErrorConfig) {
    if (config.pattern.test(url)) {
      return config.behavior;
    }
  }
  return 'show-forbidden'; // Default: show actual error
}
```

**Interceptor in `frontend/src/lib/api.ts`**:

```typescript
import { getPermissionErrorBehavior } from './permissionErrorStrategy';

// Response interceptor
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 403) {
      const behavior = getPermissionErrorBehavior(error.config.url);

      switch (behavior) {
        case 'show-404':
          // Transform 403 to 404
          error.response.status = 404;
          error.response.data = { detail: 'Not found' };
          break;

        case 'show-empty':
          // Transform 403 to empty array response
          return Promise.resolve({
            ...error.response,
            status: 200,
            data: [],
          });

        case 'show-forbidden':
          // Keep 403 as is
          break;
      }
    }

    return Promise.reject(error);
  }
);
```

**Benefits**:
- No component changes needed (they already handle empty data)
- Centralized configuration
- Easy to add new endpoints
- Testable behavior

---

## 4. Implementation Phases

### Phase 1: Define Auto-Grant Permissions (1h)

#### Files to Create

**`backend/src/gift_genie/infrastructure/permissions/group_owner_permissions.py`**

```python
"""Group owner auto-grant permissions configuration."""

# Permissions automatically granted when a user creates a group
GROUP_OWNER_AUTO_GRANT_PERMISSIONS = [
    # Group management
    "groups:read",
    "groups:update",
    "groups:delete",
    # Member management
    "members:read",
    "members:create",
    "members:update",
    "members:delete",
    # Draw management
    "draws:read",
    "draws:create",
    "draws:finalize",
    "draws:view_assignments",
    # Exclusion management
    "exclusions:read",
    "exclusions:create",
    "exclusions:delete",
]


def build_group_owner_permissions(group_id: str) -> list[str]:
    """
    Build resource-scoped permissions for a group owner.

    Args:
        group_id: UUID of the group

    Returns:
        List of permission codes in format "{resource}:{action}:{group_id}"

    Example:
        >>> build_group_owner_permissions("550e8400-e29b-41d4-a716-446655440000")
        [
            "groups:read:550e8400-e29b-41d4-a716-446655440000",
            "groups:update:550e8400-e29b-41d4-a716-446655440000",
            ...
        ]
    """
    return [f"{perm}:{group_id}" for perm in GROUP_OWNER_AUTO_GRANT_PERMISSIONS]
```

#### Tasks
- [ ] Create file
- [ ] Add docstrings
- [ ] Add unit tests for `build_group_owner_permissions()`

---

### Phase 2: Update CreateGroupUseCase (2h)

#### Files to Modify

**`backend/src/gift_genie/application/use_cases/create_group.py`**

```python
from gift_genie.domain.interfaces.user_permission_repository import (
    UserPermissionRepository,
)
from gift_genie.infrastructure.permissions.group_owner_permissions import (
    build_group_owner_permissions,
)


class CreateGroupUseCase:
    """Use case for creating a new group."""

    def __init__(
        self,
        group_repository: GroupRepository,
        user_permission_repository: UserPermissionRepository,  # NEW
    ) -> None:
        self.group_repository = group_repository
        self.user_permission_repository = user_permission_repository  # NEW

    async def execute(self, owner_id: str, name: str, description: str | None = None) -> Group:
        """
        Create a new group and auto-grant owner permissions.

        Args:
            owner_id: UUID of the user creating the group
            name: Name of the group
            description: Optional description

        Returns:
            Created Group entity
        """
        # Create the group
        group = await self.group_repository.create(
            owner_id=owner_id,
            name=name,
            description=description,
        )

        # Auto-grant owner permissions
        permissions = build_group_owner_permissions(str(group.id))
        for permission_code in permissions:
            await self.user_permission_repository.create(
                user_id=owner_id,
                permission_code=permission_code,
            )

        return group
```

**`backend/src/gift_genie/presentation/api/v1/groups.py`**

Update dependency injection:

```python
from gift_genie.infrastructure.database.user_permission_repository_impl import (
    UserPermissionRepositoryImpl,
)

async def get_create_group_use_case(
    group_repo: Annotated[GroupRepository, Depends(get_group_repository)],
    permission_repo: Annotated[  # NEW
        UserPermissionRepository, Depends(lambda: UserPermissionRepositoryImpl())
    ],
) -> CreateGroupUseCase:
    return CreateGroupUseCase(
        group_repository=group_repo,
        user_permission_repository=permission_repo,  # NEW
    )
```

#### Tasks
- [ ] Update `CreateGroupUseCase.__init__()`
- [ ] Update `CreateGroupUseCase.execute()`
- [ ] Update dependency injection in endpoint
- [ ] Ensure transaction atomicity (group + permissions)
- [ ] Add error handling for permission grant failures

---

### Phase 3: Remove Global USER_BASIC_PERMISSIONS (1h)

#### Files to Modify

**`backend/src/gift_genie/infrastructure/permissions/default_permissions.py`**

```python
"""Default permissions granted to users."""

# Previously: ["groups:create"]
# Now: Empty - all permissions are resource-scoped
USER_BASIC_PERMISSIONS: list[str] = []

# Admin permissions remain global (not resource-scoped)
ADMIN_PERMISSIONS = [
    "admin:*",
    "users:read",
    "users:update",
    "users:delete",
    "permissions:grant",
    "permissions:revoke",
    "draws:notify",  # Privileged - only admins can send notifications
]
```

**`backend/src/gift_genie/application/use_cases/register_user.py`**

```python
class RegisterUserUseCase:
    """Use case for registering a new user."""

    def __init__(
        self,
        user_repository: UserRepository,
        # Remove: user_permission_repository
    ) -> None:
        self.user_repository = user_repository

    async def execute(self, email: str, password: str, full_name: str) -> User:
        """
        Register a new user.

        Args:
            email: User's email address
            password: Plain text password (will be hashed)
            full_name: User's full name

        Returns:
            Created User entity
        """
        # Create user
        user = await self.user_repository.create(
            email=email,
            password=password,
            full_name=full_name,
        )

        # Remove: Auto-grant basic permissions
        # Permissions are now granted when users create groups

        return user
```

#### Tasks
- [ ] Set `USER_BASIC_PERMISSIONS = []`
- [ ] Remove permission repository from `RegisterUserUseCase`
- [ ] Remove permission granting logic from `execute()`
- [ ] Update dependency injection in registration endpoint
- [ ] Update docstrings

---

### Phase 4: Verify Authorization Checks (2h)

#### Files to Audit

All endpoint files in `backend/src/gift_genie/presentation/api/v1/`:
- `groups.py`
- `members.py`
- `draws.py`
- `exclusions.py`

#### Checklist for Each Endpoint

**Resource-scoped endpoints** (operate on specific groups/members/etc):

```python
@router.get("/groups/{group_id}/members")
@require_permission(
    "members:read",
    resource_id_from_path=True,  # ← MUST BE TRUE
    path_param_name="group_id",   # ← Correct param name
)
async def list_members(group_id: str):
    ...
```

**Verification steps**:
- [ ] `groups.py`: GET `/groups/{group_id}` → `resource_id_from_path=True`
- [ ] `groups.py`: PUT `/groups/{group_id}` → `resource_id_from_path=True`
- [ ] `groups.py`: DELETE `/groups/{group_id}` → `resource_id_from_path=True`
- [ ] `members.py`: All endpoints → `resource_id_from_path=True, path_param_name="group_id"`
- [ ] `draws.py`: All endpoints → `resource_id_from_path=True, path_param_name="group_id"`
- [ ] `exclusions.py`: All endpoints → `resource_id_from_path=True, path_param_name="group_id"`

**Special case - List groups endpoint**:

```python
@router.get("/groups")
# NO @require_permission decorator
# Returns only groups the user has permissions for
async def list_groups(current_user: User = Depends(get_current_user)):
    # Implementation filters groups by user permissions
    ...
```

#### Documentation
Create a reference table in code comments or docs:

| Endpoint | Permission | resource_id_from_path | path_param_name |
|----------|------------|----------------------|-----------------|
| GET /groups/{group_id} | groups:read | True | group_id |
| PUT /groups/{group_id} | groups:update | True | group_id |
| DELETE /groups/{group_id} | groups:delete | True | group_id |
| GET /groups/{group_id}/members | members:read | True | group_id |
| POST /groups/{group_id}/members | members:create | True | group_id |
| PUT /groups/{group_id}/members/{member_id} | members:update | True | group_id |
| DELETE /groups/{group_id}/members/{member_id} | members:delete | True | group_id |

---

### Phase 5: Update Backend Tests (3-4h)

#### Files to Create

**`backend/tests/test_group_owner_permissions.py`**

```python
"""Tests for group owner auto-grant permissions."""

import pytest
from gift_genie.application.use_cases.create_group import CreateGroupUseCase
from gift_genie.infrastructure.permissions.group_owner_permissions import (
    GROUP_OWNER_AUTO_GRANT_PERMISSIONS,
    build_group_owner_permissions,
)


class TestBuildGroupOwnerPermissions:
    """Tests for build_group_owner_permissions function."""

    def test_build_group_owner_permissions_format(self):
        """Test that permissions are formatted correctly."""
        group_id = "550e8400-e29b-41d4-a716-446655440000"
        permissions = build_group_owner_permissions(group_id)

        assert len(permissions) == len(GROUP_OWNER_AUTO_GRANT_PERMISSIONS)
        for perm in permissions:
            assert perm.endswith(f":{group_id}")
            assert perm.count(":") == 2  # Format: resource:action:id

    def test_build_group_owner_permissions_content(self):
        """Test that all expected permissions are included."""
        group_id = "test-id"
        permissions = build_group_owner_permissions(group_id)

        expected_prefixes = [
            "groups:read:",
            "groups:update:",
            "groups:delete:",
            "members:read:",
            "members:create:",
            "members:update:",
            "members:delete:",
            "draws:read:",
            "draws:create:",
            "draws:finalize:",
            "draws:view_assignments:",
            "exclusions:read:",
            "exclusions:create:",
            "exclusions:delete:",
        ]

        for prefix in expected_prefixes:
            assert any(perm.startswith(prefix) for perm in permissions)

    def test_draws_notify_not_included(self):
        """Test that draws:notify is NOT auto-granted."""
        permissions = build_group_owner_permissions("test-id")
        assert not any("draws:notify" in perm for perm in permissions)


@pytest.mark.asyncio
class TestCreateGroupUseCase:
    """Tests for CreateGroupUseCase with auto-grant."""

    async def test_create_group_grants_owner_permissions(
        self,
        create_group_use_case: CreateGroupUseCase,
        user_permission_repository,
        test_user,
    ):
        """Test that creating a group auto-grants owner permissions."""
        # Create group
        group = await create_group_use_case.execute(
            owner_id=str(test_user.id),
            name="Test Group",
            description="Test Description",
        )

        # Verify permissions were granted
        user_permissions = await user_permission_repository.find_by_user_id(
            str(test_user.id)
        )

        permission_codes = [p.permission_code for p in user_permissions]

        # Should have 15 permissions
        assert len(permission_codes) == 15

        # Verify format
        for code in permission_codes:
            assert code.endswith(f":{group.id}")
            assert code.count(":") == 2

    async def test_create_group_allows_immediate_access(
        self,
        create_group_use_case: CreateGroupUseCase,
        authorization_service,
        test_user,
    ):
        """Test that user can immediately access group after creation."""
        # Create group
        group = await create_group_use_case.execute(
            owner_id=str(test_user.id),
            name="Test Group",
        )

        # Verify user can access group
        can_read = await authorization_service.check_permission(
            user_id=str(test_user.id),
            permission="groups:read",
            resource_id=str(group.id),
        )
        assert can_read is True

        can_update = await authorization_service.check_permission(
            user_id=str(test_user.id),
            permission="groups:update",
            resource_id=str(group.id),
        )
        assert can_update is True
```

#### Files to Modify

All test files that create groups or check permissions:
- `test_groups_api.py`
- `test_members_api.py`
- `test_draws_api.py`
- `test_exclusions_api.py`
- `test_authorization_service.py`
- All other test files with permission checks

**Key changes**:

```python
# OLD: Manual permission granting
async def test_user_can_read_group(test_user, group_repository, permission_repo):
    group = await group_repository.create(...)
    await permission_repo.create(
        user_id=str(test_user.id),
        permission_code=f"groups:read:{group.id}",
    )
    # ... test code

# NEW: Use CreateGroupUseCase
async def test_user_can_read_group(test_user, create_group_use_case):
    group = await create_group_use_case.execute(
        owner_id=str(test_user.id),
        name="Test Group",
    )
    # Permissions automatically granted!
    # ... test code
```

#### Tasks
- [ ] Create `test_group_owner_permissions.py`
- [ ] Update test fixtures to provide `CreateGroupUseCase`
- [ ] Replace manual permission grants with use case calls
- [ ] Update permission assertion counts (0 → 15 per group)
- [ ] Run full test suite: `make test`

---

### Phase 6: Frontend Permission Error Strategy (2-3h)

#### Files to Create

**`frontend/src/lib/permissionErrorStrategy.ts`**

(Full implementation shown in section 3.4 above)

#### Files to Modify

**`frontend/src/lib/api.ts`**

```typescript
import axios from 'axios';
import { getPermissionErrorBehavior } from './permissionErrorStrategy';

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || 'http://localhost:8000',
  withCredentials: true,
});

// Response interceptor for permission errors
api.interceptors.response.use(
  (response) => response,
  (error) => {
    // Handle 403 Forbidden based on endpoint configuration
    if (error.response?.status === 403) {
      const url = error.config.url?.replace(api.defaults.baseURL || '', '') || '';
      const behavior = getPermissionErrorBehavior(url);

      switch (behavior) {
        case 'show-404':
          // Transform to 404 Not Found
          error.response.status = 404;
          error.response.data = { detail: 'Not found' };
          break;

        case 'show-empty':
          // Transform to empty array response
          return Promise.resolve({
            ...error.response,
            status: 200,
            data: [],
          });

        case 'show-forbidden':
          // Keep as 403 (e.g., for admin endpoints)
          break;
      }
    }

    return Promise.reject(error);
  }
);

export default api;
```

#### Testing Strategy

**Unit tests for strategy config**:

```typescript
// frontend/src/lib/permissionErrorStrategy.test.ts
import { describe, it, expect } from 'vitest';
import { getPermissionErrorBehavior } from './permissionErrorStrategy';

describe('permissionErrorStrategy', () => {
  it('returns show-404 for group detail endpoint', () => {
    const behavior = getPermissionErrorBehavior(
      '/api/v1/groups/550e8400-e29b-41d4-a716-446655440000'
    );
    expect(behavior).toBe('show-404');
  });

  it('returns show-empty for groups list endpoint', () => {
    const behavior = getPermissionErrorBehavior('/api/v1/groups');
    expect(behavior).toBe('show-empty');
  });

  it('returns show-forbidden for admin endpoints', () => {
    const behavior = getPermissionErrorBehavior('/api/v1/admin/users');
    expect(behavior).toBe('show-forbidden');
  });

  it('returns show-forbidden for unknown endpoints', () => {
    const behavior = getPermissionErrorBehavior('/api/v1/unknown');
    expect(behavior).toBe('show-forbidden');
  });
});
```

#### Tasks
- [ ] Create `permissionErrorStrategy.ts`
- [ ] Update `api.ts` interceptor
- [ ] Create unit tests
- [ ] Verify no component changes needed (they already handle empty data)
- [ ] Run frontend tests: `npm test`

---

### Phase 7: E2E Tests (2h)

#### Files to Create

**`frontend/e2e/groups/group-permissions.spec.ts`**

```typescript
import { test, expect } from '@playwright/test';
import { LoginPage } from '../page-objects/LoginPage';
import { GroupsPage } from '../page-objects/GroupsPage';

test.describe('Group Permissions', () => {
  test('user can manage own group immediately after creation', async ({ page }) => {
    const loginPage = new LoginPage(page);
    const groupsPage = new GroupsPage(page);

    // Register and login
    await loginPage.goto();
    await loginPage.register('user@test.com', 'password123', 'Test User');

    // Create group
    await groupsPage.goto();
    await groupsPage.createGroup('My Group', 'My Description');

    // Should immediately see group
    await expect(page.getByText('My Group')).toBeVisible();

    // Should be able to view group details
    await page.getByText('My Group').click();
    await expect(page.getByText('My Description')).toBeVisible();

    // Should be able to add members
    await page.getByRole('button', { name: /add member/i }).click();
    // ... member creation flow
  });

  test('user cannot access another users group', async ({ page, context }) => {
    // User 1 creates group
    const loginPage1 = new LoginPage(page);
    await loginPage1.goto();
    await loginPage1.register('user1@test.com', 'password123', 'User One');

    const groupsPage1 = new GroupsPage(page);
    await groupsPage1.goto();
    await groupsPage1.createGroup('User 1 Group', 'Private group');

    // Get group URL
    await page.getByText('User 1 Group').click();
    const groupUrl = page.url();

    // Logout
    await loginPage1.logout();

    // User 2 tries to access User 1's group
    const page2 = await context.newPage();
    const loginPage2 = new LoginPage(page2);
    await loginPage2.goto();
    await loginPage2.register('user2@test.com', 'password123', 'User Two');

    // Try to access User 1's group directly
    await page2.goto(groupUrl);

    // Should see 404 or "Not found" message
    await expect(
      page2.getByText(/not found|404/i)
    ).toBeVisible();
  });

  test('list endpoints show empty when user has no groups', async ({ page }) => {
    const loginPage = new LoginPage(page);
    const groupsPage = new GroupsPage(page);

    // Register and login
    await loginPage.goto();
    await loginPage.register('newuser@test.com', 'password123', 'New User');

    // Go to groups page
    await groupsPage.goto();

    // Should see empty state (not 403 error)
    await expect(
      page.getByText(/no groups|create your first group/i)
    ).toBeVisible();

    // Should NOT see error message
    await expect(page.getByText(/forbidden|403|error/i)).not.toBeVisible();
  });

  test('user can manage members in own group', async ({ page }) => {
    const loginPage = new LoginPage(page);
    const groupsPage = new GroupsPage(page);

    await loginPage.goto();
    await loginPage.register('owner@test.com', 'password123', 'Owner');

    await groupsPage.goto();
    await groupsPage.createGroup('Test Group', 'Test');
    await page.getByText('Test Group').click();

    // Add member
    await page.getByRole('button', { name: /add member/i }).click();
    await page.getByLabel(/name/i).fill('John Doe');
    await page.getByLabel(/email/i).fill('john@example.com');
    await page.getByRole('button', { name: /save|create/i }).click();

    // Should see member
    await expect(page.getByText('John Doe')).toBeVisible();

    // Edit member
    await page.getByText('John Doe').click();
    await page.getByRole('button', { name: /edit/i }).click();
    await page.getByLabel(/name/i).fill('Jane Doe');
    await page.getByRole('button', { name: /save/i }).click();

    // Should see updated name
    await expect(page.getByText('Jane Doe')).toBeVisible();

    // Delete member
    await page.getByRole('button', { name: /delete/i }).click();
    await page.getByRole('button', { name: /confirm/i }).click();

    // Should not see member
    await expect(page.getByText('Jane Doe')).not.toBeVisible();
  });
});
```

#### Tasks
- [ ] Create permission E2E test file
- [ ] Implement page objects if needed
- [ ] Run E2E tests: `npm run test:e2e`
- [ ] Verify all scenarios pass
- [ ] Add to CI pipeline

---

### Phase 8: Documentation (1h)

#### Files to Create

**`.ai/resource-permissions-guide.md`**

```markdown
# Resource-Level Permissions Guide

## Overview
Gift Genie uses a resource-level permissions system where permissions are scoped to specific resources (groups, members, draws, exclusions).

## Permission Format
```
{resource}:{action}:{resource_id}
```

Examples:
- `groups:read:550e8400-e29b-41d4-a716-446655440000`
- `members:create:550e8400-e29b-41d4-a716-446655440000`
- `draws:finalize:550e8400-e29b-41d4-a716-446655440000`

## Auto-Grant on Group Creation
When a user creates a group, they automatically receive 15 permissions:
- 3 group management permissions
- 4 member management permissions
- 4 draw management permissions (excluding `draws:notify`)
- 3 exclusion management permissions

## Adding Resource-Scoped Endpoints

### Backend
```python
@router.get("/groups/{group_id}/members")
@require_permission(
    "members:read",
    resource_id_from_path=True,
    path_param_name="group_id",
)
async def list_members(group_id: str):
    ...
```

### Frontend
No special handling needed. The API interceptor automatically transforms 403 errors based on endpoint type.

## Testing
Always use `CreateGroupUseCase` in tests to ensure permissions are auto-granted:

```python
group = await create_group_use_case.execute(
    owner_id=str(test_user.id),
    name="Test Group",
)
# User now has all 15 permissions for this group
```

## Troubleshooting
- **403 on own group**: Ensure `resource_id_from_path=True` on endpoint
- **Missing permissions**: Verify group was created via `CreateGroupUseCase`
- **Wrong resource_id**: Check that child resources use `group_id`, not their own ID
```

#### Files to Update

**`.ai/permissions-system-implementation-plan.md`**

Add section:
```markdown
## Resource-Level Permissions (COMPLETED)
See `.ai/resource-level-permissions-implementation-plan.md` for full details.

- Auto-grant 15 permissions on group creation
- Format: `{resource}:{action}:{resource_id}`
- Frontend interceptor transforms 403s to 404s or empty arrays
- Zero manual permission management needed
```

#### API Documentation

Update OpenAPI/Swagger docs to document:
- Permission requirements for each endpoint
- Auto-grant behavior on group creation
- Error response codes (404 for unauthorized access)

#### Tasks
- [ ] Create resource permissions guide
- [ ] Update main permissions plan
- [ ] Update API documentation
- [ ] Add code comments to key files
- [ ] Update README if needed

---

## 5. Database Reset Procedure

Since we're starting with a fresh database (no production data), resetting is straightforward:

### Development Environment

```bash
# Navigate to backend
cd backend

# Option 1: Use Makefile (recommended)
make db-reset

# Option 2: Manual reset
alembic downgrade base
alembic upgrade head
python -m gift_genie.infrastructure.database.seeds.permissions_seed

# Option 3: Docker Compose (drops and recreates containers)
cd ..
docker-compose down -v
docker-compose up -d
```

### Verification

After reset, verify:

```bash
# Check tables exist
psql $DATABASE_URL -c "\dt"

# Check no user_permissions exist
psql $DATABASE_URL -c "SELECT COUNT(*) FROM user_permissions;"
# Expected: 0

# Check users table is empty
psql $DATABASE_URL -c "SELECT COUNT(*) FROM users;"
# Expected: 0
```

### Re-seeding (if needed)

```bash
# Run permission seeds (if any)
python -m gift_genie.infrastructure.database.seeds.permissions_seed

# Create test admin user (optional)
python -m gift_genie.infrastructure.database.seeds.admin_user_seed
```

---

## 6. Testing Strategy

### Unit Tests
**Location**: `backend/tests/`

**Coverage**:
- `test_group_owner_permissions.py`: Permission building and format
- `test_create_group.py`: Auto-grant behavior
- `test_authorization_service.py`: Resource-scoped permission checking

**Commands**:
```bash
cd backend
make test
# or
pytest tests/test_group_owner_permissions.py -v
```

### Integration Tests
**Location**: `backend/tests/`

**Coverage**:
- `test_groups_api.py`: Full group creation flow with permissions
- `test_members_api.py`: Member operations with resource-scoped permissions
- `test_draws_api.py`: Draw operations
- `test_exclusions_api.py`: Exclusion operations

**Commands**:
```bash
cd backend
pytest tests/test_groups_api.py::test_create_group_auto_grants_permissions -v
```

### Frontend Unit Tests
**Location**: `frontend/src/lib/`

**Coverage**:
- `permissionErrorStrategy.test.ts`: Strategy config behavior
- `api.test.ts`: Interceptor transformations

**Commands**:
```bash
cd frontend
npm test
# or
npm test -- permissionErrorStrategy.test.ts
```

### E2E Tests
**Location**: `frontend/e2e/`

**Coverage**:
- `groups/group-permissions.spec.ts`: Full user journeys
- Scenarios: create group, access own group, cannot access others' groups, empty lists

**Commands**:
```bash
cd frontend
npm run test:e2e
# or
npx playwright test groups/group-permissions.spec.ts
```

### Manual Verification Checklist

After implementation:

- [ ] **Register new user**: No permissions initially
- [ ] **Create group**: User has 15 permissions automatically
- [ ] **Access own group**: No 403 errors
- [ ] **View members page**: Empty list (not 403)
- [ ] **Add member**: Works immediately
- [ ] **Create second user**: Cannot see first user's group
- [ ] **Try direct URL to other's group**: Shows 404 (not 403)
- [ ] **List groups as second user**: Shows empty array (not 403)
- [ ] **Admin endpoints**: Still show 403 for non-admins

---

## 7. Risk Assessment

| Risk | Impact | Likelihood | Mitigation | Contingency |
|------|--------|------------|------------|-------------|
| Breaking existing tests | Medium | High | Update fixtures systematically; run tests frequently | Fix tests incrementally; use git to track changes |
| Forgetting `resource_id_from_path` | High | Medium | Code review checklist; grep for `@require_permission` | Add integration tests that catch missing flag |
| Performance (15 inserts/group) | Low | Low | ~50ms is acceptable; can batch in future | Profile with 1000+ groups; add bulk insert if needed |
| Permission explosion (many groups) | Low | Low | Typical user has 1-10 groups = 15-150 permissions | Add pagination to permission queries if needed |
| Frontend interceptor breaking other endpoints | Medium | Low | Comprehensive config; unit tests | Make interceptor opt-in per endpoint pattern |
| Incorrect resource hierarchy | High | Low | Clear docs; always use group_id for children | Write migration script if we need to change hierarchy |
| Transaction failures during auto-grant | Medium | Low | Use database transactions; test rollback behavior | Add retry logic; log failures for monitoring |
| Missing permission for common action | Low | Medium | Test all user flows; get user feedback | Easy to add permission to auto-grant list |

### Risk Mitigation Strategies

**Code Review Checklist**:
- [ ] All resource-scoped endpoints have `resource_id_from_path=True`
- [ ] Child resources use `group_id` (not their own ID)
- [ ] CreateGroupUseCase is used in all tests
- [ ] Frontend interceptor config covers all endpoints
- [ ] Permission list includes all common actions

**Monitoring**:
- Log permission grant failures
- Track 403 error rates in production
- Monitor permission query performance
- Alert on unexpected permission counts

---

## 8. Success Criteria

### Functional Requirements
- ✅ Users can create groups and immediately access them (no 403 errors)
- ✅ Users cannot access other users' groups (403 or 404)
- ✅ List endpoints return empty arrays when user has no access (not 403)
- ✅ All CRUD operations work for group owners on their groups
- ✅ Member/draw/exclusion operations work with resource-scoped permissions
- ✅ Admin permissions remain global (not resource-scoped)

### Non-Functional Requirements
- ✅ Permission grant performance: <100ms per group creation
- ✅ Permission check performance: <50ms per request
- ✅ Zero manual permission management needed
- ✅ Database remains consistent (atomic transactions)
- ✅ No breaking changes to existing API contracts

### Quality Requirements
- ✅ All unit tests passing (backend + frontend)
- ✅ All integration tests passing
- ✅ All E2E tests passing
- ✅ Code coverage: >80% for new code
- ✅ No linting errors
- ✅ Documentation complete and accurate

### User Experience Requirements
- ✅ No confusing 403 errors on owned resources
- ✅ Clear "empty state" messaging when no groups exist
- ✅ Consistent behavior across all resource types
- ✅ Fast response times (no noticeable latency)

---

## 9. Timeline Summary

| Phase | Effort | Description |
|-------|--------|-------------|
| **Phase 1: Auto-grant config** | 1h | Create `group_owner_permissions.py` with permission list |
| **Phase 2: Update CreateGroupUseCase** | 2h | Add auto-grant logic to group creation |
| **Phase 3: Remove global permissions** | 1h | Set `USER_BASIC_PERMISSIONS = []` |
| **Phase 4: Verify authorization** | 2h | Audit all endpoints for `resource_id_from_path` |
| **Phase 5: Backend tests** | 3-4h | Update fixtures and assertions |
| **Phase 6: Frontend strategy** | 2-3h | Implement interceptor and config |
| **Phase 7: E2E tests** | 2h | Test full user journeys |
| **Phase 8: Documentation** | 1h | Write guides and update docs |
| **TOTAL** | **14-17h** | Complete implementation |

### Suggested Schedule

**Day 1 (4-5h)**:
- Phase 1: Auto-grant config (1h)
- Phase 2: Update CreateGroupUseCase (2h)
- Phase 3: Remove global permissions (1h)
- Testing: Verify basic flow works (1h)

**Day 2 (5-6h)**:
- Phase 4: Verify authorization (2h)
- Phase 5: Backend tests (3-4h)

**Day 3 (5-6h)**:
- Phase 6: Frontend strategy (2-3h)
- Phase 7: E2E tests (2h)
- Phase 8: Documentation (1h)
- Final testing and cleanup (1h)

---

## 10. Implementation Checklist

### Pre-Implementation
- [ ] Read and understand this plan
- [ ] Backup current database (if needed)
- [ ] Create feature branch: `git checkout -b feature/resource-level-permissions`
- [ ] Reset development database: `make db-reset`

### Phase 1: Auto-Grant Config
- [ ] Create `backend/src/gift_genie/infrastructure/permissions/group_owner_permissions.py`
- [ ] Implement `GROUP_OWNER_AUTO_GRANT_PERMISSIONS` list
- [ ] Implement `build_group_owner_permissions()` function
- [ ] Add unit tests
- [ ] Run tests: `pytest tests/test_group_owner_permissions.py`

### Phase 2: Update CreateGroupUseCase
- [ ] Update `CreateGroupUseCase.__init__()` to accept `user_permission_repository`
- [ ] Update `CreateGroupUseCase.execute()` to auto-grant permissions
- [ ] Update dependency injection in `groups.py` endpoint
- [ ] Test manually: create group via API, verify permissions in database
- [ ] Run tests: `pytest tests/test_groups_api.py -k create`

### Phase 3: Remove Global Permissions
- [ ] Set `USER_BASIC_PERMISSIONS = []` in `default_permissions.py`
- [ ] Remove permission repository from `RegisterUserUseCase`
- [ ] Update dependency injection in registration endpoint
- [ ] Run tests: `pytest tests/test_auth_register_api.py`

### Phase 4: Verify Authorization
- [ ] Audit `groups.py` endpoints
- [ ] Audit `members.py` endpoints
- [ ] Audit `draws.py` endpoints
- [ ] Audit `exclusions.py` endpoints
- [ ] Document findings in code comments
- [ ] Run full backend test suite: `make test`

### Phase 5: Backend Tests
- [ ] Update `conftest.py` fixtures (add `create_group_use_case`)
- [ ] Update `test_groups_api.py`
- [ ] Update `test_members_api.py`
- [ ] Update `test_draws_api.py`
- [ ] Update `test_exclusions_api.py`
- [ ] Update `test_authorization_service.py`
- [ ] Run full test suite: `make test`
- [ ] Verify all tests pass

### Phase 6: Frontend Strategy
- [ ] Create `frontend/src/lib/permissionErrorStrategy.ts`
- [ ] Update `frontend/src/lib/api.ts` interceptor
- [ ] Create `frontend/src/lib/permissionErrorStrategy.test.ts`
- [ ] Run frontend tests: `npm test`
- [ ] Verify components handle empty data correctly

### Phase 7: E2E Tests
- [ ] Create `frontend/e2e/groups/group-permissions.spec.ts`
- [ ] Implement test scenarios
- [ ] Run E2E tests: `npm run test:e2e`
- [ ] Verify all scenarios pass

### Phase 8: Documentation
- [ ] Create `.ai/resource-permissions-guide.md`
- [ ] Update `.ai/permissions-system-implementation-plan.md`
- [ ] Update API documentation (Swagger/OpenAPI)
- [ ] Add code comments to key files
- [ ] Update README if needed

### Final Verification
- [ ] Run full backend test suite: `cd backend && make test`
- [ ] Run full frontend test suite: `cd frontend && npm test`
- [ ] Run E2E tests: `cd frontend && npm run test:e2e`
- [ ] Manual testing: Full user journey (register → create group → add members)
- [ ] Check database: Verify permissions are created correctly
- [ ] Code review: Self-review all changes
- [ ] Linting: `cd backend && ruff check . && mypy .`
- [ ] Linting: `cd frontend && npm run lint`

### Deployment
- [ ] Commit changes: `git add -A && git commit -m "feat: implement resource-level permissions"`
- [ ] Push branch: `git push origin feature/resource-level-permissions`
- [ ] Create pull request
- [ ] Request code review
- [ ] Merge to main after approval
- [ ] Deploy to staging
- [ ] Run smoke tests on staging
- [ ] Deploy to production

---

## 11. Code Examples

### Permission Building

```python
# backend/src/gift_genie/infrastructure/permissions/group_owner_permissions.py

GROUP_OWNER_AUTO_GRANT_PERMISSIONS = [
    "groups:read", "groups:update", "groups:delete",
    "members:read", "members:create", "members:update", "members:delete",
    "draws:read", "draws:create", "draws:finalize", "draws:view_assignments",
    "exclusions:read", "exclusions:create", "exclusions:delete",
]


def build_group_owner_permissions(group_id: str) -> list[str]:
    """Build resource-scoped permissions for a group owner."""
    return [f"{perm}:{group_id}" for perm in GROUP_OWNER_AUTO_GRANT_PERMISSIONS]


# Example usage:
>>> build_group_owner_permissions("550e8400-e29b-41d4-a716-446655440000")
[
    "groups:read:550e8400-e29b-41d4-a716-446655440000",
    "groups:update:550e8400-e29b-41d4-a716-446655440000",
    "groups:delete:550e8400-e29b-41d4-a716-446655440000",
    "members:read:550e8400-e29b-41d4-a716-446655440000",
    # ... 11 more permissions
]
```

### Updated CreateGroupUseCase

```python
# backend/src/gift_genie/application/use_cases/create_group.py

from gift_genie.domain.entities.group import Group
from gift_genie.domain.interfaces.group_repository import GroupRepository
from gift_genie.domain.interfaces.user_permission_repository import UserPermissionRepository
from gift_genie.infrastructure.permissions.group_owner_permissions import (
    build_group_owner_permissions,
)


class CreateGroupUseCase:
    """Use case for creating a new group with auto-grant permissions."""

    def __init__(
        self,
        group_repository: GroupRepository,
        user_permission_repository: UserPermissionRepository,
    ) -> None:
        self.group_repository = group_repository
        self.user_permission_repository = user_permission_repository

    async def execute(
        self,
        owner_id: str,
        name: str,
        description: str | None = None,
    ) -> Group:
        """
        Create a new group and auto-grant owner permissions.

        The owner receives 15 resource-scoped permissions:
        - 3 group management permissions
        - 4 member management permissions
        - 4 draw management permissions
        - 3 exclusion management permissions

        Args:
            owner_id: UUID of the user creating the group
            name: Name of the group
            description: Optional description

        Returns:
            Created Group entity with auto-granted permissions

        Raises:
            ValueError: If name is empty or too long
            RepositoryError: If database operation fails
        """
        # Create the group
        group = await self.group_repository.create(
            owner_id=owner_id,
            name=name,
            description=description,
        )

        # Auto-grant owner permissions
        permissions = build_group_owner_permissions(str(group.id))

        # Batch insert permissions (atomic transaction)
        for permission_code in permissions:
            await self.user_permission_repository.create(
                user_id=owner_id,
                permission_code=permission_code,
            )

        return group
```

### Frontend Permission Error Strategy

```typescript
// frontend/src/lib/permissionErrorStrategy.ts

export type PermissionErrorBehavior = 'show-404' | 'show-empty' | 'show-forbidden';

export interface EndpointPermissionConfig {
  pattern: RegExp;
  behavior: PermissionErrorBehavior;
}

export const permissionErrorConfig: EndpointPermissionConfig[] = [
  // Detail endpoints: Transform 403 to 404
  {
    pattern: /^\/api\/v1\/groups\/[0-9a-f-]+$/,
    behavior: 'show-404',
  },
  {
    pattern: /^\/api\/v1\/groups\/[0-9a-f-]+\/members\/[0-9a-f-]+$/,
    behavior: 'show-404',
  },
  {
    pattern: /^\/api\/v1\/groups\/[0-9a-f-]+\/draws\/[0-9a-f-]+$/,
    behavior: 'show-404',
  },

  // List endpoints: Transform 403 to empty array
  {
    pattern: /^\/api\/v1\/groups$/,
    behavior: 'show-empty',
  },
  {
    pattern: /^\/api\/v1\/groups\/[0-9a-f-]+\/members$/,
    behavior: 'show-empty',
  },
  {
    pattern: /^\/api\/v1\/groups\/[0-9a-f-]+\/draws$/,
    behavior: 'show-empty',
  },
  {
    pattern: /^\/api\/v1\/groups\/[0-9a-f-]+\/exclusions$/,
    behavior: 'show-empty',
  },

  // Admin endpoints: Keep 403 as-is
  {
    pattern: /^\/api\/v1\/admin\/.*/,
    behavior: 'show-forbidden',
  },
];

export function getPermissionErrorBehavior(url: string): PermissionErrorBehavior {
  for (const config of permissionErrorConfig) {
    if (config.pattern.test(url)) {
      return config.behavior;
    }
  }
  return 'show-forbidden'; // Default: show actual forbidden error
}
```

### API Interceptor

```typescript
// frontend/src/lib/api.ts (excerpt)

import { getPermissionErrorBehavior } from './permissionErrorStrategy';

api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 403) {
      const url = error.config.url?.replace(api.defaults.baseURL || '', '') || '';
      const behavior = getPermissionErrorBehavior(url);

      switch (behavior) {
        case 'show-404':
          error.response.status = 404;
          error.response.data = { detail: 'Not found' };
          break;

        case 'show-empty':
          return Promise.resolve({
            ...error.response,
            status: 200,
            data: [],
          });

        case 'show-forbidden':
          // Keep as 403
          break;
      }
    }

    return Promise.reject(error);
  }
);
```

### Test Examples

```python
# backend/tests/test_group_owner_permissions.py

@pytest.mark.asyncio
async def test_create_group_grants_owner_permissions(
    create_group_use_case,
    user_permission_repository,
    test_user,
):
    """Test that creating a group auto-grants 15 owner permissions."""
    # Create group
    group = await create_group_use_case.execute(
        owner_id=str(test_user.id),
        name="Test Group",
        description="Test Description",
    )

    # Verify permissions were granted
    user_permissions = await user_permission_repository.find_by_user_id(
        str(test_user.id)
    )

    permission_codes = [p.permission_code for p in user_permissions]

    # Should have exactly 15 permissions
    assert len(permission_codes) == 15

    # Verify format: {resource}:{action}:{group_id}
    for code in permission_codes:
        assert code.endswith(f":{group.id}")
        assert code.count(":") == 2

    # Verify specific permissions
    assert f"groups:read:{group.id}" in permission_codes
    assert f"members:create:{group.id}" in permission_codes
    assert f"draws:finalize:{group.id}" in permission_codes
    assert f"exclusions:delete:{group.id}" in permission_codes

    # Verify draws:notify is NOT granted
    assert not any("draws:notify" in code for code in permission_codes)
```

```typescript
// frontend/e2e/groups/group-permissions.spec.ts (excerpt)

test('user can manage own group immediately after creation', async ({ page }) => {
  const loginPage = new LoginPage(page);
  const groupsPage = new GroupsPage(page);

  // Register and login
  await loginPage.goto();
  await loginPage.register('user@test.com', 'password123', 'Test User');

  // Create group
  await groupsPage.goto();
  await groupsPage.createGroup('My Group', 'My Description');

  // Should immediately see group (no 403 error)
  await expect(page.getByText('My Group')).toBeVisible();

  // Should be able to view group details
  await page.getByText('My Group').click();
  await expect(page.getByText('My Description')).toBeVisible();

  // Should be able to add members
  await page.getByRole('button', { name: /add member/i }).click();
  await page.getByLabel(/name/i).fill('John Doe');
  await page.getByLabel(/email/i).fill('john@example.com');
  await page.getByRole('button', { name: /save|create/i }).click();

  // Verify member was added
  await expect(page.getByText('John Doe')).toBeVisible();
});
```

---

## 12. Future Enhancements

### Phase 2: Permission Caching (Estimated: 3-5h)
**Problem**: Every request queries the database for permissions.

**Solution**: Cache permissions in Redis with TTL.

```python
# Pseudocode
async def get_user_permissions(user_id: str) -> list[str]:
    # Check cache first
    cached = await redis.get(f"permissions:{user_id}")
    if cached:
        return json.loads(cached)

    # Query database
    permissions = await db.get_permissions(user_id)

    # Cache for 5 minutes
    await redis.setex(
        f"permissions:{user_id}",
        300,
        json.dumps(permissions)
    )

    return permissions
```

**Benefits**: Reduced database load, faster authorization checks.

### Phase 3: Permission Expiration (Estimated: 5-8h)
**Problem**: Permissions never expire, even for temporary access.

**Solution**: Add `expires_at` column to `user_permissions` table.

```sql
ALTER TABLE user_permissions
    ADD COLUMN expires_at TIMESTAMP WITH TIME ZONE;

CREATE INDEX idx_user_permissions_expires_at
    ON user_permissions(expires_at);
```

**Use cases**:
- Temporary admin access
- Time-limited group sharing
- Trial periods

### Phase 4: Permission Sharing/Delegation (Estimated: 8-12h)
**Problem**: Users can't share groups with collaborators.

**Solution**: Add permission granting UI and workflow.

**Features**:
- Group owners can grant permissions to other users
- Granular control (read-only vs full access)
- Expiration dates for shared access
- Revocation workflow

**UI mockup**:
```
Group Settings > Sharing
┌─────────────────────────────────────┐
│ Share "My Group"                    │
├─────────────────────────────────────┤
│ Email: [user@example.com        ]   │
│ Access: [▼ Can view              ]  │
│         - Can view                  │
│         - Can edit members          │
│         - Full access               │
│ Expires: [Never              ▼]    │
│ [Share]                             │
├─────────────────────────────────────┤
│ Current collaborators:              │
│ • john@example.com (Can edit) [×]   │
│ • jane@example.com (Can view) [×]   │
└─────────────────────────────────────┘
```

### Phase 5: Resource-Level Admin UI (Estimated: 10-15h)
**Problem**: Admins need to manually grant/revoke permissions via SQL.

**Solution**: Build admin panel for permission management.

**Features**:
- View all users and their permissions
- Grant/revoke permissions individually or in bulk
- Search users by email, group, permission
- Audit log of permission changes
- Export permissions to CSV

**Routes**:
- `/admin/permissions` - List all permissions
- `/admin/permissions/users/{user_id}` - User's permissions
- `/admin/permissions/groups/{group_id}` - Group's permissions
- `/admin/permissions/audit` - Audit log

### Phase 6: Permission Templates (Estimated: 5-8h)
**Problem**: Repetitive permission grants for common roles.

**Solution**: Create permission templates/roles.

**Examples**:
```python
PERMISSION_TEMPLATES = {
    "group_viewer": [
        "groups:read",
        "members:read",
        "draws:read",
    ],
    "group_editor": [
        "groups:read", "groups:update",
        "members:read", "members:create", "members:update", "members:delete",
        "draws:read", "draws:create",
        "exclusions:read", "exclusions:create", "exclusions:delete",
    ],
    "group_owner": GROUP_OWNER_AUTO_GRANT_PERMISSIONS,
}

# Usage
await grant_permissions_from_template(
    user_id="...",
    group_id="...",
    template="group_viewer"
)
```

### Phase 7: Permission Analytics (Estimated: 3-5h)
**Problem**: No visibility into permission usage patterns.

**Solution**: Track and visualize permission usage.

**Metrics**:
- Most common permissions checked
- Denied permission attempts (potential security issues)
- Permission grant/revoke frequency
- Average permissions per user/group

**Dashboard**:
```
Permission Analytics
┌─────────────────────────────────────┐
│ Most Checked Permissions (24h)      │
│ 1. groups:read         1,234 checks │
│ 2. members:read          876 checks │
│ 3. draws:read            543 checks │
├─────────────────────────────────────┤
│ Permission Denials (24h)            │
│ • 403 on draws:notify: 45           │
│ • 403 on groups:read: 12            │
├─────────────────────────────────────┤
│ Top Permission Holders              │
│ • admin@example.com: 250 perms      │
│ • power-user@example.com: 180 perms │
└─────────────────────────────────────┘
```

---

## Appendix A: Glossary

**Resource-scoped permission**: A permission tied to a specific resource (e.g., `groups:read:550e8400-...`)

**Auto-grant**: Automatically granting permissions when a resource is created

**Permission code**: String identifier for a permission (e.g., `members:create:550e8400-...`)

**Resource hierarchy**: Parent-child relationship between resources (group → members/draws/exclusions)

**Permission explosion**: Large number of permission records due to many resources

**Privileged permission**: Permission that requires special approval (e.g., `draws:notify`)

---

## Appendix B: Related Documents

- `.ai/permissions-system-implementation-plan.md` - Original permissions system plan
- `.ai/architecture.md` - Overall system architecture
- `.ai/database.md` - Database schema and conventions
- `.ai/api-docs.md` - API endpoint documentation
- `backend/DRAW_ALGORITHM.md` - Draw algorithm documentation
- `.ai/tech_stack.md` - Technology stack overview

---

## Appendix C: FAQ

**Q: Why not use role-based permissions (RBAC)?**
A: Resource-level permissions provide finer control. RBAC groups permissions into roles, but we need per-resource access (users can manage their own groups but not others').

**Q: Why store permissions as strings instead of separate resource_id column?**
A: Simplicity. The current schema works well, and optimizing prematurely adds complexity. We can add a column later if needed.

**Q: Why auto-grant instead of manual grant?**
A: User experience. Users expect to immediately access resources they create. Manual grants require extra API calls and add friction.

**Q: Why exclude `draws:notify` from auto-grant?**
A: Cost control. Sending notifications has real costs (email/SMS). We want explicit admin approval for this capability.

**Q: Can permissions be revoked?**
A: Yes, via the UserPermissionRepository. Future enhancement: Add revocation UI.

**Q: What happens if auto-grant fails mid-way?**
A: The transaction should be atomic. If any permission insert fails, the entire group creation rolls back.

**Q: How do we handle permission updates (e.g., adding new permissions)?**
A: Existing groups don't automatically get new permissions. We'd need a migration script or manual grants.

**Q: Can users have permissions without owning the group?**
A: Yes! Admins (or future sharing features) can grant permissions to any user for any group.

**Q: What's the performance impact of 15 permission inserts?**
A: ~50ms per group creation. Acceptable for our use case. Can be optimized with bulk inserts if needed.

**Q: Why transform 403 to 404 on detail endpoints?**
A: Security: Don't reveal existence of resources users can't access. Better UX: "Not found" is clearer than "Forbidden".

---

**Document Version**: 1.0
**Last Updated**: 2025-01-19
**Author**: Gift Genie Team
**Status**: Ready for Implementation
