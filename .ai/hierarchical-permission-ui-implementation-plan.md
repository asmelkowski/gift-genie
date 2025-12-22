# Hierarchical Permission Management UI - Implementation Plan

## 1. Executive Summary

### Problem Statement

The current permission management UI displays all permissions as a flat list, which becomes unwieldy with resource-scoped permissions:

- **Old model**: 15 global permissions per user (e.g., `groups:read`, `draws:notify`)
- **New model**: 14 permissions × N groups (e.g., `groups:read:550e8400-...`, `members:create:550e8400-...`)

**For a user with 5 groups**: 70 individual permission entries
**For a user with 20 groups**: 280+ entries

The current UI cannot effectively display or manage this volume of permissions.

### Proposed Solution

Implement a **hierarchical, group-centric permission management UI** that:

1. **Groups permissions by resource** (group) instead of showing flat list
2. **Displays group names** instead of UUIDs for better readability
3. **Provides permission presets** (Owner, Editor, Viewer) for quick bulk operations
4. **Enables bulk grant/revoke** operations at the group level
5. **Highlights privileged permissions** (e.g., `draws:notify`)

### Key Benefits

- ✅ **Scalable**: Works with 5 groups or 100 groups
- ✅ **Intuitive**: "Grant permissions for Christmas Group" vs managing 14 UUID-based codes
- ✅ **Efficient**: Bulk grant 14 permissions in one click instead of 14 individual grants
- ✅ **Maintainable**: Clean separation between group context and permissions
- ✅ **Future-proof**: Foundation for delegation features (group owners managing their own permissions)

### Timeline Estimate

**Total: 10-14 hours** across 4 implementation phases

---

## 2. Current State Analysis

### ✅ What Already Exists

**Backend:**
- Permission grant/revoke endpoints (`POST/DELETE /admin/users/{user_id}/permissions`)
- List user permissions (`GET /admin/users/{user_id}/permissions`)
- List available permissions (`GET /admin/permissions`)
- Bulk grant support in repository (`grant_permissions_bulk`)

**Frontend:**
- `PermissionManagerDialog` component (well-architected, ready for enhancement)
- React Query hooks (`useGrantPermission`, `useRevokePermission`, `useUserPermissions`)
- Permission badge component
- Admin dashboard with user listing

### ❌ What's Missing

**Backend:**
- Endpoint to get permissions grouped by resource (group)
- Endpoint to bulk grant permission presets for a group
- Group lookup in permission responses (currently returns bare permission codes)

**Frontend:**
- Group-centric data structure for permissions
- Permission preset logic (Owner, Editor, Viewer)
- Bulk grant/revoke UI components
- Group name display in permission context

---

## 3. Technical Design

### 3.1 Permission Presets

Define three standard permission presets based on common use cases:

```python
# backend/src/gift_genie/infrastructure/permissions/permission_presets.py

from gift_genie.infrastructure.permissions.permission_registry import PermissionRegistry
from gift_genie.infrastructure.permissions.group_owner_permissions import (
    GROUP_OWNER_AUTO_GRANT_PERMISSIONS,
)

class PermissionPresets:
    """Standard permission presets for group access control."""

    # Owner: Full control (all auto-granted permissions)
    OWNER = GROUP_OWNER_AUTO_GRANT_PERMISSIONS  # 14 permissions

    # Editor: Read + modify, but cannot delete group
    EDITOR = [
        PermissionRegistry.GROUPS_READ,
        PermissionRegistry.GROUPS_UPDATE,  # Can update group settings
        PermissionRegistry.MEMBERS_READ,
        PermissionRegistry.MEMBERS_CREATE,
        PermissionRegistry.MEMBERS_UPDATE,
        PermissionRegistry.MEMBERS_DELETE,  # Can manage members
        PermissionRegistry.DRAWS_READ,
        PermissionRegistry.DRAWS_CREATE,
        PermissionRegistry.DRAWS_FINALIZE,
        PermissionRegistry.DRAWS_VIEW_ASSIGNMENTS,
        PermissionRegistry.EXCLUSIONS_READ,
        PermissionRegistry.EXCLUSIONS_CREATE,
        PermissionRegistry.EXCLUSIONS_DELETE,
    ]  # 13 permissions (excludes groups:delete)

    # Viewer: Read-only access to all resources
    VIEWER = [
        PermissionRegistry.GROUPS_READ,
        PermissionRegistry.MEMBERS_READ,
        PermissionRegistry.DRAWS_READ,
        PermissionRegistry.DRAWS_VIEW_ASSIGNMENTS,
        PermissionRegistry.EXCLUSIONS_READ,
    ]  # 5 permissions

    # Special: Only draws:notify (can be added to any preset)
    NOTIFY_PERMISSION = PermissionRegistry.DRAWS_NOTIFY


def detect_preset(permission_codes: list[str]) -> str | None:
    """Detect which preset a list of permissions matches.

    Args:
        permission_codes: List of base permission codes (without resource_id)

    Returns:
        "owner", "editor", "viewer", or None if custom
    """
    codes_set = set(permission_codes)

    if codes_set == set(PermissionPresets.OWNER):
        return "owner"
    elif codes_set == set(PermissionPresets.EDITOR):
        return "editor"
    elif codes_set == set(PermissionPresets.VIEWER):
        return "viewer"

    return None  # Custom combination
```

### 3.2 Backend API Design

#### New Endpoints

##### 1. Get User Permissions Grouped by Group

**Endpoint:** `GET /admin/users/{user_id}/permissions/grouped`

**Purpose:** Return user's permissions organized by group for easier UI rendering.

**Response:**
```json
{
  "groups": [
    {
      "group_id": "550e8400-e29b-41d4-a716-446655440000",
      "group_name": "My Christmas Group",
      "preset": "owner",  // "owner" | "editor" | "viewer" | "custom" | null
      "permissions": [
        {
          "code": "groups:read:550e8400-...",
          "base_permission": "groups:read",
          "name": "Read Own Groups",
          "category": "groups"
        },
        {
          "code": "members:create:550e8400-...",
          "base_permission": "members:create",
          "name": "Add Members",
          "category": "members"
        }
        // ... 12 more
      ],
      "permission_count": 14,
      "has_notify": false
    },
    {
      "group_id": "abc123-def456-...",
      "group_name": "Work Secret Santa",
      "preset": "viewer",
      "permissions": [...],
      "permission_count": 5,
      "has_notify": false
    }
  ],
  "ungrouped_permissions": [
    // Any permissions that don't have a group_id (e.g., groups:create, admin:*)
    {
      "code": "admin:view_dashboard",
      "name": "View Admin Dashboard",
      "category": "admin"
    }
  ]
}
```

**Implementation:**
```python
# backend/src/gift_genie/application/use_cases/get_user_permissions_grouped.py

from dataclasses import dataclass
from gift_genie.domain.interfaces.repositories import (
    UserRepository,
    UserPermissionRepository,
    GroupRepository,
)
from gift_genie.infrastructure.permissions.permission_presets import detect_preset


@dataclass
class GroupPermissionsDTO:
    group_id: str
    group_name: str
    preset: str | None
    permissions: list[dict]
    permission_count: int
    has_notify: bool


@dataclass
class GroupedPermissionsResponse:
    groups: list[GroupPermissionsDTO]
    ungrouped_permissions: list[dict]


class GetUserPermissionsGroupedUseCase:
    """Get user's permissions organized by group."""

    def __init__(
        self,
        user_repository: UserRepository,
        user_permission_repository: UserPermissionRepository,
        group_repository: GroupRepository,
    ):
        self.user_repo = user_repository
        self.user_perm_repo = user_permission_repository
        self.group_repo = group_repository

    async def execute(
        self,
        requesting_user_id: str,
        target_user_id: str,
    ) -> GroupedPermissionsResponse:
        """Execute the use case.

        Args:
            requesting_user_id: Admin user requesting the data
            target_user_id: User whose permissions to retrieve

        Returns:
            Grouped permissions response

        Raises:
            ForbiddenError: If requesting user is not admin
            NotFoundError: If target user doesn't exist
        """
        # 1. Verify requesting user is admin
        requesting_user = await self.user_repo.get_by_id(requesting_user_id)
        if not requesting_user or requesting_user.role != "admin":
            raise ForbiddenError("Only admins can view user permissions")

        # 2. Verify target user exists
        target_user = await self.user_repo.get_by_id(target_user_id)
        if not target_user:
            raise NotFoundError(f"User {target_user_id} not found")

        # 3. Get all user permissions
        user_permissions = await self.user_perm_repo.list_permissions_for_user(
            target_user_id
        )

        # 4. Group permissions by resource_id
        grouped: dict[str, list] = {}
        ungrouped: list = []

        for perm in user_permissions:
            parts = perm.code.split(":")

            if len(parts) == 3:  # Resource-scoped: resource:action:id
                resource_id = parts[2]
                if resource_id not in grouped:
                    grouped[resource_id] = []
                grouped[resource_id].append(perm)
            else:  # Ungrouped: resource:action
                ungrouped.append({
                    "code": perm.code,
                    "name": perm.name,
                    "category": perm.category,
                })

        # 5. Build group DTOs with names and presets
        group_dtos: list[GroupPermissionsDTO] = []

        for group_id, perms in grouped.items():
            # Get group name
            group = await self.group_repo.get_by_id(group_id)
            group_name = group.name if group else f"Unknown Group ({group_id[:8]}...)"

            # Extract base permissions (without resource_id)
            base_permissions = [":".join(p.code.split(":")[:2]) for p in perms]

            # Detect preset
            preset = detect_preset(base_permissions)

            # Check for notify permission
            has_notify = any("draws:notify" in p.code for p in perms)

            # Build permission list
            permission_list = [
                {
                    "code": p.code,
                    "base_permission": ":".join(p.code.split(":")[:2]),
                    "name": p.name,
                    "category": p.category,
                }
                for p in perms
            ]

            group_dtos.append(
                GroupPermissionsDTO(
                    group_id=group_id,
                    group_name=group_name,
                    preset=preset,
                    permissions=permission_list,
                    permission_count=len(perms),
                    has_notify=has_notify,
                )
            )

        # Sort by group name
        group_dtos.sort(key=lambda g: g.group_name.lower())

        return GroupedPermissionsResponse(
            groups=group_dtos,
            ungrouped_permissions=ungrouped,
        )
```

##### 2. Bulk Grant Group Permissions

**Endpoint:** `POST /admin/users/{user_id}/groups/{group_id}/permissions`

**Purpose:** Grant multiple permissions for a group at once (supports presets).

**Request Body:**
```json
{
  "preset": "owner",  // "owner" | "editor" | "viewer" | "custom"
  "include_notify": false,  // Optional: add draws:notify permission
  "custom_permissions": []  // Only used if preset = "custom"
}
```

**Response:**
```json
{
  "granted_count": 14,
  "permission_codes": [
    "groups:read:550e8400-...",
    "members:create:550e8400-...",
    // ... all granted permissions
  ]
}
```

**Implementation:**
```python
# backend/src/gift_genie/application/use_cases/bulk_grant_group_permissions.py

from dataclasses import dataclass
from gift_genie.domain.interfaces.repositories import (
    UserRepository,
    GroupRepository,
    UserPermissionRepository,
)
from gift_genie.infrastructure.permissions.permission_presets import PermissionPresets


@dataclass
class BulkGrantGroupPermissionsCommand:
    requesting_user_id: str
    target_user_id: str
    group_id: str
    preset: str  # "owner", "editor", "viewer", "custom"
    include_notify: bool = False
    custom_permissions: list[str] | None = None


class BulkGrantGroupPermissionsUseCase:
    """Bulk grant permissions for a specific group."""

    def __init__(
        self,
        user_repository: UserRepository,
        group_repository: GroupRepository,
        user_permission_repository: UserPermissionRepository,
    ):
        self.user_repo = user_repository
        self.group_repo = group_repository
        self.user_perm_repo = user_permission_repository

    async def execute(
        self, command: BulkGrantGroupPermissionsCommand
    ) -> dict:
        """Execute bulk grant.

        Args:
            command: Bulk grant command

        Returns:
            Dict with granted_count and permission_codes

        Raises:
            ForbiddenError: If requesting user is not admin
            NotFoundError: If user or group doesn't exist
            ValueError: If invalid preset
        """
        # 1. Verify admin
        requesting_user = await self.user_repo.get_by_id(command.requesting_user_id)
        if not requesting_user or requesting_user.role != "admin":
            raise ForbiddenError("Only admins can grant permissions")

        # 2. Verify target user exists
        target_user = await self.user_repo.get_by_id(command.target_user_id)
        if not target_user:
            raise NotFoundError(f"User {command.target_user_id} not found")

        # 3. Verify group exists
        group = await self.group_repo.get_by_id(command.group_id)
        if not group:
            raise NotFoundError(f"Group {command.group_id} not found")

        # 4. Determine base permissions from preset
        if command.preset == "owner":
            base_permissions = PermissionPresets.OWNER
        elif command.preset == "editor":
            base_permissions = PermissionPresets.EDITOR
        elif command.preset == "viewer":
            base_permissions = PermissionPresets.VIEWER
        elif command.preset == "custom":
            if not command.custom_permissions:
                raise ValueError("custom_permissions required for custom preset")
            base_permissions = command.custom_permissions
        else:
            raise ValueError(f"Invalid preset: {command.preset}")

        # 5. Build resource-scoped permission codes
        permission_codes = [f"{perm}:{command.group_id}" for perm in base_permissions]

        # 6. Add notify permission if requested
        if command.include_notify:
            notify_code = f"{PermissionPresets.NOTIFY_PERMISSION}:{command.group_id}"
            if notify_code not in permission_codes:
                permission_codes.append(notify_code)

        # 7. Bulk grant permissions
        await self.user_perm_repo.grant_permissions_bulk(
            user_id=command.target_user_id,
            permission_codes=permission_codes,
            granted_by=command.requesting_user_id,
        )

        return {
            "granted_count": len(permission_codes),
            "permission_codes": permission_codes,
        }
```

##### 3. Revoke All Group Permissions

**Endpoint:** `DELETE /admin/users/{user_id}/groups/{group_id}/permissions`

**Purpose:** Revoke all permissions for a specific group at once.

**Response:** `204 No Content`

**Implementation:**
```python
# backend/src/gift_genie/application/use_cases/revoke_all_group_permissions.py

class RevokeAllGroupPermissionsUseCase:
    """Revoke all permissions for a specific group."""

    async def execute(
        self,
        requesting_user_id: str,
        target_user_id: str,
        group_id: str,
    ) -> int:
        """Revoke all group permissions.

        Returns:
            Number of permissions revoked
        """
        # 1. Verify admin
        # 2. Get all user permissions
        user_permissions = await self.user_perm_repo.list_by_user(target_user_id)

        # 3. Filter permissions for this group
        group_permission_codes = [
            perm.permission_code
            for perm in user_permissions
            if perm.permission_code.endswith(f":{group_id}")
        ]

        # 4. Revoke each permission
        revoked_count = 0
        for code in group_permission_codes:
            success = await self.user_perm_repo.revoke_permission(
                target_user_id, code
            )
            if success:
                revoked_count += 1

        return revoked_count
```

##### 4. Search Groups for Grant

**Endpoint:** `GET /admin/groups/search?q={query}&limit={10}`

**Purpose:** Search groups by name for the "Add Group Permissions" dropdown.

**Response:**
```json
{
  "results": [
    {
      "id": "550e8400-...",
      "name": "My Christmas Group",
      "admin_user_id": "user-123",
      "created_at": "2025-12-01T10:00:00Z"
    }
  ]
}
```

### 3.3 Frontend UI Design

#### Component Architecture

```
PermissionManagerDialog (Enhanced)
├── UserInfoHeader (existing, unchanged)
├── SearchBar (existing, for filtering permissions)
├── UngroupedPermissionsSection (new, for admin:* permissions)
│   └── PermissionBadge[]
├── GroupPermissionsSection[] (new, one per group)
│   ├── GroupHeader
│   │   ├── GroupName + ID badge
│   │   ├── PresetSelector dropdown (Owner/Editor/Viewer/Custom)
│   │   └── RemoveAllButton (revoke all for this group)
│   └── PermissionCheckboxGrid (when expanded)
│       ├── GroupPermissions (read, update, delete)
│       ├── MemberPermissions (read, create, update, delete)
│       ├── DrawPermissions (read, create, finalize, view_assignments)
│       ├── SpecialPermissions (notify - highlighted in yellow)
│       └── ExclusionPermissions (read, create, delete)
└── AddGroupPermissionsButton (new)
    └── GroupSearchDropdown (searchable)
```

#### Data Structures

```typescript
// frontend/src/types/permissions.ts

export type PermissionPreset = 'owner' | 'editor' | 'viewer' | 'custom';

export interface BasePermission {
  resource: string;  // "groups", "members", etc.
  action: string;    // "read", "create", etc.
}

export interface GroupPermissions {
  groupId: string;
  groupName: string;
  preset: PermissionPreset | null;
  permissions: {
    groups: {
      read: boolean;
      update: boolean;
      delete: boolean;
    };
    members: {
      read: boolean;
      create: boolean;
      update: boolean;
      delete: boolean;
    };
    draws: {
      read: boolean;
      create: boolean;
      finalize: boolean;
      view_assignments: boolean;
      notify: boolean;  // Highlighted as privileged
    };
    exclusions: {
      read: boolean;
      create: boolean;
      delete: boolean;
    };
  };
  permissionCount: number;
  hasNotify: boolean;
}

export interface UngroupedPermission {
  code: string;
  name: string;
  category: string;
}

export interface GroupedPermissionsData {
  groups: GroupPermissions[];
  ungroupedPermissions: UngroupedPermission[];
}
```

#### Permission Preset Definitions (Frontend)

```typescript
// frontend/src/lib/permissionPresets.ts

export const PERMISSION_PRESETS = {
  owner: {
    label: 'Owner',
    description: 'Full control over the group',
    permissions: {
      groups: { read: true, update: true, delete: true },
      members: { read: true, create: true, update: true, delete: true },
      draws: { read: true, create: true, finalize: true, view_assignments: true, notify: false },
      exclusions: { read: true, create: true, delete: true },
    },
  },
  editor: {
    label: 'Editor',
    description: 'Can modify but not delete group',
    permissions: {
      groups: { read: true, update: true, delete: false },
      members: { read: true, create: true, update: true, delete: true },
      draws: { read: true, create: true, finalize: true, view_assignments: true, notify: false },
      exclusions: { read: true, create: true, delete: true },
    },
  },
  viewer: {
    label: 'Viewer',
    description: 'Read-only access',
    permissions: {
      groups: { read: true, update: false, delete: false },
      members: { read: true, create: false, update: false, delete: false },
      draws: { read: true, create: false, finalize: false, view_assignments: true, notify: false },
      exclusions: { read: true, create: false, delete: false },
    },
  },
} as const;

export function detectPreset(permissions: GroupPermissions['permissions']): PermissionPreset | null {
  for (const [preset, config] of Object.entries(PERMISSION_PRESETS)) {
    if (isEqual(permissions, config.permissions)) {
      return preset as PermissionPreset;
    }
  }
  return null;  // Custom
}

function isEqual(a: any, b: any): boolean {
  return JSON.stringify(a) === JSON.stringify(b);
}
```

---

## 4. Implementation Phases

### Phase 1: Backend - Grouped Permissions API (3-4 hours)

**Objective:** Create backend endpoints to support group-centric permission management.

#### Tasks

**1.1 Create Permission Presets Module** (30 min)
```
File: backend/src/gift_genie/infrastructure/permissions/permission_presets.py
- Define PermissionPresets class with OWNER, EDITOR, VIEWER constants
- Implement detect_preset() function
- Add unit tests
```

**1.2 Implement GetUserPermissionsGroupedUseCase** (1.5 hours)
```
Files:
- backend/src/gift_genie/application/use_cases/get_user_permissions_grouped.py
- backend/src/gift_genie/application/dto/grouped_permissions_response.py

Steps:
1. Create use case class with repositories
2. Implement permission grouping logic
3. Add group name lookup
4. Implement preset detection
5. Add error handling
6. Write unit tests (15+ test cases)
```

**1.3 Implement BulkGrantGroupPermissionsUseCase** (1 hour)
```
File: backend/src/gift_genie/application/use_cases/bulk_grant_group_permissions.py

Steps:
1. Create command DTO
2. Implement preset → permission list mapping
3. Use existing grant_permissions_bulk repository method
4. Add validation
5. Write unit tests
```

**1.4 Implement RevokeAllGroupPermissionsUseCase** (30 min)
```
File: backend/src/gift_genie/application/use_cases/revoke_all_group_permissions.py

Steps:
1. Filter permissions by group_id
2. Bulk revoke
3. Return count
4. Write unit tests
```

**1.5 Create API Endpoints** (1 hour)
```
File: backend/src/gift_genie/presentation/api/v1/admin.py

Endpoints:
1. GET /admin/users/{user_id}/permissions/grouped
2. POST /admin/users/{user_id}/groups/{group_id}/permissions
3. DELETE /admin/users/{user_id}/groups/{group_id}/permissions
4. GET /admin/groups/search?q={query}

Steps:
1. Add Pydantic request/response models
2. Wire up use cases with dependency injection
3. Add OpenAPI documentation
4. Write integration tests
```

**Testing Checklist:**
- [ ] Unit tests for all use cases (>90% coverage)
- [ ] Integration tests for API endpoints
- [ ] Test preset detection logic
- [ ] Test bulk grant idempotency
- [ ] Test permission filtering by group_id
- [ ] Test error cases (invalid preset, non-existent group)

---

### Phase 2: Frontend - Data Layer (2-3 hours)

**Objective:** Create React Query hooks and data transformation utilities.

#### Tasks

**2.1 Create Permission Utilities** (45 min)
```
File: frontend/src/lib/permissionHelpers.ts

Functions:
- parsePermissionCode(code: string): { resource, action, resourceId }
- formatPermissionLabel(code: string): string
- isPrivilegedPermission(code: string): boolean
- groupPermissionsByResource(permissions: Permission[]): Map<string, Permission[]>
```

**2.2 Create Permission Presets Module** (30 min)
```
File: frontend/src/lib/permissionPresets.ts

Exports:
- PERMISSION_PRESETS constant
- detectPreset() function
- getPresetPermissions(preset: string) function
```

**2.3 Create React Query Hooks** (1-1.5 hours)
```
Files:
- frontend/src/hooks/useGroupedPermissions.ts
- frontend/src/hooks/useBulkGrantPermissions.ts
- frontend/src/hooks/useRevokeGroupPermissions.ts
- frontend/src/hooks/useGroupSearch.ts

Each hook should:
- Use React Query for caching
- Handle loading/error states
- Invalidate related queries on mutation
- Show toast notifications on success/error
```

**Example:**
```typescript
// frontend/src/hooks/useGroupedPermissions.ts

import { useQuery } from '@tanstack/react-query';
import api from '@/lib/api';
import type { GroupedPermissionsData } from '@/types/permissions';

export const useGroupedPermissions = (userId: string) => {
  return useQuery<GroupedPermissionsData>({
    queryKey: ['admin', 'users', userId, 'permissions', 'grouped'],
    queryFn: async () => {
      const { data } = await api.get(
        `/admin/users/${userId}/permissions/grouped`
      );
      return data;
    },
    enabled: !!userId,
  });
};
```

**2.4 Add TypeScript Types** (15 min)
```
File: frontend/src/types/permissions.ts

Types:
- PermissionPreset
- BasePermission
- GroupPermissions
- UngroupedPermission
- GroupedPermissionsData
- BulkGrantRequest
- BulkGrantResponse
```

**Testing Checklist:**
- [ ] Unit tests for permissionHelpers.ts
- [ ] Unit tests for permissionPresets.ts
- [ ] Mock API calls in hook tests
- [ ] Test query invalidation on mutations
- [ ] Test error handling

---

### Phase 3: Frontend - UI Components (3-4 hours)

**Objective:** Transform `PermissionManagerDialog` into a hierarchical permission UI.

#### Tasks

**3.1 Create GroupPermissionSection Component** (1.5 hours)
```
File: frontend/src/components/AdminDashboard/GroupPermissionSection.tsx

Props:
- groupId: string
- groupName: string
- permissions: GroupPermissions['permissions']
- preset: PermissionPreset | null
- onPresetChange: (preset: PermissionPreset) => void
- onPermissionToggle: (category: string, action: string, value: boolean) => void
- onRemoveAll: () => void
- isExpanded: boolean
- onToggleExpand: () => void

Features:
- Collapsible section with group name in header
- Preset dropdown (Owner/Editor/Viewer/Custom)
- Permission checkboxes organized by category
- "Remove All Permissions" button with confirmation
- Highlight for privileged permissions (notify)
- Loading states during mutations
```

**3.2 Create UngroupedPermissionsSection Component** (30 min)
```
File: frontend/src/components/AdminDashboard/UngroupedPermissionsSection.tsx

Features:
- Display admin:* and other ungrouped permissions
- Grant/revoke buttons
- Badge display
```

**3.3 Create AddGroupPermissionsButton Component** (1 hour)
```
File: frontend/src/components/AdminDashboard/AddGroupPermissionsButton.tsx

Features:
- Dropdown/modal with searchable group list
- Preview of permissions that will be granted
- Preset selector (Owner/Editor/Viewer)
- "Grant Permissions" confirmation
```

**3.4 Refactor PermissionManagerDialog** (1-1.5 hours)
```
File: frontend/src/components/AdminDashboard/PermissionManagerDialog.tsx

Changes:
1. Replace flat permission list with grouped sections
2. Use useGroupedPermissions hook instead of useUserPermissions
3. Add GroupPermissionSection[] components
4. Add UngroupedPermissionsSection component
5. Add AddGroupPermissionsButton component
6. Update search to filter across all groups
7. Handle preset changes with bulk grant mutations
8. Handle individual permission toggles
9. Add optimistic updates for better UX

State Management:
- expandedGroups: Set<string>
- searchQuery: string
- pendingMutations: Map<string, boolean>
```

**Example Structure:**
```tsx
export function PermissionManagerDialog({ userId, ... }) {
  const { data: groupedPermissions, isLoading } = useGroupedPermissions(userId);
  const bulkGrant = useBulkGrantPermissions(userId);
  const revokeGroup = useRevokeGroupPermissions(userId);

  const [expandedGroups, setExpandedGroups] = useState<Set<string>>(new Set());

  const handlePresetChange = async (groupId: string, preset: PermissionPreset) => {
    await bulkGrant.mutateAsync({
      groupId,
      preset,
      includeNotify: false,
    });
  };

  return (
    <Dialog {...props}>
      {/* Search bar */}
      <SearchBar value={searchQuery} onChange={setSearchQuery} />

      {/* Ungrouped permissions */}
      {groupedPermissions?.ungroupedPermissions.length > 0 && (
        <UngroupedPermissionsSection
          permissions={groupedPermissions.ungroupedPermissions}
          onGrant={handleGrantUngrouped}
          onRevoke={handleRevokeUngrouped}
        />
      )}

      {/* Group permissions */}
      <div className="space-y-3">
        {groupedPermissions?.groups.map((group) => (
          <GroupPermissionSection
            key={group.groupId}
            groupId={group.groupId}
            groupName={group.groupName}
            permissions={group.permissions}
            preset={group.preset}
            onPresetChange={(preset) => handlePresetChange(group.groupId, preset)}
            onRemoveAll={() => handleRemoveAll(group.groupId)}
            isExpanded={expandedGroups.has(group.groupId)}
            onToggleExpand={() => toggleGroupExpansion(group.groupId)}
          />
        ))}
      </div>

      {/* Add group permissions */}
      <AddGroupPermissionsButton
        userId={userId}
        existingGroupIds={groupedPermissions?.groups.map(g => g.groupId) || []}
        onGrant={handleAddGroupPermissions}
      />
    </Dialog>
  );
}
```

**Testing Checklist:**
- [ ] Unit tests for each component
- [ ] Test preset change triggers bulk grant
- [ ] Test individual permission toggle
- [ ] Test remove all confirmation flow
- [ ] Test search filtering across groups
- [ ] Test expand/collapse behavior
- [ ] Test loading and error states

---

### Phase 4: Testing & Polish (2-3 hours)

**Objective:** Comprehensive testing and UX refinements.

#### Tasks

**4.1 E2E Tests** (1.5 hours)
```
File: frontend/e2e/admin/hierarchical-permissions.spec.ts

Scenarios:
1. Admin grants Owner preset to user for a group
   - Verify all 14 permissions are granted
   - Verify preset shows as "Owner"

2. Admin changes preset from Owner to Viewer
   - Verify permissions are updated
   - Verify preset dropdown reflects change

3. Admin toggles individual permission (preset becomes Custom)
   - Verify permission is toggled
   - Verify preset changes to "Custom"

4. Admin adds permissions for a new group
   - Search for group
   - Select preset
   - Grant permissions
   - Verify new group appears in list

5. Admin removes all permissions for a group
   - Click "Remove All"
   - Confirm deletion
   - Verify group section is removed

6. Admin grants notify permission
   - Expand group
   - Toggle "Send Notifications"
   - Verify yellow highlight/badge
   - Verify persistence

7. Search filters permissions across groups
   - Type "member" in search
   - Verify only member permissions shown
   - Verify groups without matches are hidden
```

**4.2 Integration Tests** (30 min)
```
Tests:
- API endpoint integration with database
- Permission cascade (group deleted → permissions revoked?)
- Concurrent permission grants (race conditions)
- Large datasets (100+ groups)
```

**4.3 UI/UX Polish** (1 hour)
```
Improvements:
- Add loading skeletons for permission sections
- Add empty state for users with no permissions
- Add success animations for bulk operations
- Add keyboard shortcuts (Ctrl+F for search)
- Add tooltips for permission descriptions
- Improve mobile responsiveness
- Add dark mode support
- Add "Recently Granted" indicator (< 24 hours)
- Add permission count in group header
- Add visual diff when changing presets
```

**4.4 Documentation** (30 min)
```
Files to update:
- .ai/hierarchical-permission-ui-implementation-plan.md (this file)
- .ai/resource-permissions-guide.md (add admin section)
- backend/README.md (document new endpoints)
- frontend/README.md (document new components)
- Add inline code comments
- Update OpenAPI/Swagger docs
```

**Testing Checklist:**
- [ ] All E2E tests passing
- [ ] Manual testing with different user scenarios
- [ ] Performance testing with 100+ groups
- [ ] Cross-browser testing (Chrome, Firefox, Safari)
- [ ] Mobile responsiveness testing
- [ ] Accessibility testing (keyboard nav, screen readers)
- [ ] Load testing (concurrent admin users)

---

## 5. Database Considerations

### No Schema Changes Required ✅

The current database schema already supports all required functionality:

```sql
-- user_permissions table (existing)
CREATE TABLE user_permissions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    permission_code VARCHAR(255) NOT NULL,  -- Supports "resource:action:group_id"
    granted_by UUID REFERENCES users(id) ON DELETE SET NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(user_id, permission_code)
);

CREATE INDEX idx_user_permissions_user_id ON user_permissions(user_id);
```

**Why no changes needed:**
- `permission_code` VARCHAR(255) can store `groups:read:550e8400-...` (68 chars)
- Existing index on `user_id` supports efficient lookups
- `granted_by` already tracks who granted the permission

### Optional Performance Optimization (Future)

If querying "all users with permissions on group X" becomes common:

```sql
-- Add materialized view for fast group permission queries
CREATE MATERIALIZED VIEW group_permission_grants AS
SELECT
    up.user_id,
    u.email,
    u.name,
    SPLIT_PART(up.permission_code, ':', 3) AS group_id,
    COUNT(*) AS permission_count
FROM user_permissions up
JOIN users u ON u.id = up.user_id
WHERE up.permission_code LIKE '%:%:%'  -- Only resource-scoped
GROUP BY up.user_id, u.email, u.name, group_id;

CREATE INDEX idx_group_permission_grants_group_id
    ON group_permission_grants(group_id);

-- Refresh periodically or on permission changes
REFRESH MATERIALIZED VIEW group_permission_grants;
```

**Not needed now** - only implement if we add "view all users for this group" admin feature.

---

## 6. Error Handling & Edge Cases

### Backend Error Scenarios

| Scenario | HTTP Status | Error Message | Handling |
|----------|-------------|---------------|----------|
| User not found | 404 | "User {id} not found" | Return error |
| Group not found | 404 | "Group {id} not found" | Return error |
| Invalid preset | 400 | "Invalid preset: {preset}" | Return error |
| Not an admin | 403 | "Only admins can manage permissions" | Return error |
| Bulk grant partial failure | 207 Multi-Status | List of succeeded/failed grants | Return partial success |
| Permission already granted | 200 | (idempotent) | No-op, return existing |
| Group deleted mid-operation | 404 | "Group no longer exists" | Return error |

### Frontend Error Scenarios

| Scenario | User Experience | Recovery Action |
|----------|----------------|-----------------|
| API timeout | Toast: "Request timed out. Please try again." | Retry button |
| Network error | Toast: "Network error. Check your connection." | Auto-retry after 3s |
| Permission grant fails | Toast: "Failed to grant permission: {reason}" | Revert optimistic update |
| Preset change fails | Toast: "Failed to change preset. Some permissions may not have been updated." | Refresh permissions |
| Concurrent modification | Toast: "Permissions were modified by another admin. Refreshing..." | Auto-refresh data |
| Search returns no results | Empty state: "No permissions match '{query}'" | Clear search button |

### Edge Cases to Handle

**1. User has partial preset permissions:**
```
Scenario: User has 10 out of 14 Owner permissions
Display: Preset = "Custom" (not "Owner")
Action: Show which permissions are missing in UI
```

**2. Group is deleted while dialog is open:**
```
Backend: Return 404 for that group
Frontend: Remove group section, show toast "Group was deleted"
```

**3. Multiple admins editing same user:**
```
Frontend: Use polling or WebSocket to detect changes
Show notification: "Permissions updated by another admin"
Offer "Refresh" or "Merge Changes" button
```

**4. Very long group names:**
```
UI: Truncate to 50 chars with "..." and show full name in tooltip
Format: "My Very Long Christmas Group N..." (hover for full)
```

**5. User has 100+ groups:**
```
UI: Implement virtual scrolling for group list
Add pagination or "Load More" button
Improve search to filter groups by name
```

---

## 7. User Experience Flow

### Admin Grant Permission Flow

```
1. Admin navigates to Admin Dashboard
   ↓
2. Searches for user by email/name
   ↓
3. Clicks "Manage Permissions" button
   ↓
4. Permission Manager Dialog opens
   - Shows existing group permissions (collapsed)
   - Shows ungrouped permissions (admin:*)
   ↓
5. Admin clicks "Add Group Permissions" button
   ↓
6. Group search modal appears
   - Admin types "Christmas"
   - Dropdown shows matching groups
   ↓
7. Admin selects "My Christmas Group"
   ↓
8. Preset selector appears with preview
   - Owner: 14 permissions
   - Editor: 13 permissions
   - Viewer: 5 permissions
   ↓
9. Admin selects "Editor" preset
   ↓
10. Confirmation: "Grant 13 permissions for My Christmas Group?"
    ↓
11. Admin clicks "Grant Permissions"
    ↓
12. Loading spinner appears (optimistic update)
    ↓
13. Success toast: "Granted 13 permissions for My Christmas Group"
    ↓
14. New group section appears in dialog
    - Shows "Editor" preset
    - Shows permission count (13/14)
    - Collapsed by default
    ↓
15. Admin expands section to verify
    - Checkboxes show which permissions are granted
    - Notify permission is unchecked (privileged)
    ↓
16. Admin toggles "Send Notifications" checkbox
    ↓
17. Immediate update (optimistic)
    - Preset changes to "Custom"
    - Yellow badge appears on notify permission
    ↓
18. Success toast: "Permission granted"
```

### Admin Revoke Permission Flow

```
1. Admin opens permission dialog for user
   ↓
2. Finds group section "Work Secret Santa"
   ↓
3. Clicks "Remove All Permissions" button
   ↓
4. Confirmation modal: "Remove all 14 permissions for Work Secret Santa?"
   ↓
5. Admin clicks "Confirm"
   ↓
6. Loading spinner
   ↓
7. Success toast: "Revoked 14 permissions"
   ↓
8. Group section slides out and disappears
```

---

## 8. Visual Design Mockup

```
┌─────────────────────────────────────────────────────────────────────┐
│ Manage Permissions for John Doe                              [×]    │
├─────────────────────────────────────────────────────────────────────┤
│                                                                       │
│  John Doe                                                            │
│  john.doe@example.com                                               │
│  42 of 65 total permissions granted                                 │
│                                                                       │
│  ┌─────────────────────────────────────────────────────────────┐   │
│  │ 🔍 Search permissions by name, group, or code...             │   │
│  └─────────────────────────────────────────────────────────────┘   │
│                                                                       │
│  ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━      │
│                                                                       │
│  📋 System Permissions (2)                                          │
│  ┌─────────────────────────────────────────────────────────────┐   │
│  │ [admin:view_dashboard] View Admin Dashboard          [×]    │   │
│  │ [groups:create] Create Groups                         [×]    │   │
│  └─────────────────────────────────────────────────────────────┘   │
│                                                                       │
│  ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━      │
│                                                                       │
│  🎄 My Christmas Group (14 permissions)                             │
│  ┌─────────────────────────────────────────────────────────────┐   │
│  │ Preset: [Owner ▼]                    [Remove All]     [▼]   │   │
│  ├─────────────────────────────────────────────────────────────┤   │
│  │ Groups:      [✓] View  [✓] Edit  [✓] Delete                │   │
│  │ Members:     [✓] View  [✓] Add   [✓] Edit  [✓] Remove      │   │
│  │ Draws:       [✓] View  [✓] Create [✓] Finalize [✓] View Assignments │
│  │ Draws:       [✓] Send Notifications ⚠️ Privileged            │   │
│  │ Exclusions:  [✓] View  [✓] Create [✓] Delete                │   │
│  └─────────────────────────────────────────────────────────────┘   │
│                                                                       │
│  🎅 Work Secret Santa (5 permissions)                               │
│  ┌─────────────────────────────────────────────────────────────┐   │
│  │ Preset: [Viewer ▼]                   [Remove All]     [▶]   │   │
│  └─────────────────────────────────────────────────────────────┘   │
│  (collapsed)                                                         │
│                                                                       │
│  ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━      │
│                                                                       │
│  [+ Add Group Permissions]                                          │
│                                                                       │
│  ─────────────────────────────────────────────────────────────────  │
│                                                             [Close]   │
└─────────────────────────────────────────────────────────────────────┘
```

---

## 9. Migration Strategy

### No Data Migration Required ✅

**Why:** The current permission data structure already uses resource-scoped codes:
- Existing: `groups:read:550e8400-...`
- New UI: Groups by `550e8400-...` → shows as "My Christmas Group"

### Rollout Plan

**Step 1: Deploy Backend (1 hour)**
```bash
# 1. Deploy new endpoints
cd backend
make test  # Verify all tests pass
make docker-build
make docker-push

# 2. Deploy to production
# Update container with new image
# No database migrations needed

# 3. Verify endpoints
curl -X GET /api/admin/users/{user_id}/permissions/grouped
# Should return grouped permissions
```

**Step 2: Deploy Frontend (1 hour)**
```bash
# 1. Build new UI
cd frontend
npm test  # Verify tests pass
npm run build

# 2. Deploy static assets
make docker-build
make docker-push

# 3. Update frontend container
# Clear CDN cache if applicable

# 4. Verify UI
# Login as admin
# Navigate to /admin
# Open permission dialog
# Should see new hierarchical UI
```

**Step 3: Verify & Monitor (ongoing)**
```
Monitoring:
- Check for 4xx/5xx errors on new endpoints
- Monitor permission grant/revoke success rates
- Collect admin feedback on UX

Rollback Plan (if needed):
- Revert frontend to previous version
- Old UI will continue to work (uses existing endpoints)
- New endpoints are backward-compatible
```

---

## 10. Success Criteria

### Functional Requirements

- ✅ Admin can view user permissions grouped by resource (group)
- ✅ Admin can grant permission presets (Owner/Editor/Viewer) in one click
- ✅ Admin can toggle individual permissions (preset becomes "Custom")
- ✅ Admin can revoke all permissions for a group in one click
- ✅ Admin can search groups to add new permission grants
- ✅ Admin can search/filter permissions across all groups
- ✅ Privileged permissions (notify) are visually highlighted
- ✅ Permission count is displayed per group
- ✅ Group names are displayed instead of UUIDs
- ✅ Ungrouped permissions (admin:*) are shown separately

### Non-Functional Requirements

- ✅ **Performance**: Grouped permissions API responds in <500ms with 100 groups
- ✅ **Performance**: Bulk grant operation completes in <2s for 14 permissions
- ✅ **Scalability**: UI remains responsive with 100+ groups
- ✅ **Usability**: Admin can grant permissions for a new group in <15 seconds
- ✅ **Reliability**: Optimistic updates revert correctly on errors
- ✅ **Accessibility**: Keyboard navigation works for all controls
- ✅ **Mobile**: Responsive design works on tablets (768px+)

### Quality Requirements

- ✅ **Test Coverage**: >85% for new backend code
- ✅ **Test Coverage**: >80% for new frontend components
- ✅ **E2E Tests**: All 7 scenarios pass consistently
- ✅ **Documentation**: API docs updated with new endpoints
- ✅ **Code Quality**: No linting errors, passes type checking
- ✅ **Security**: Only admins can access permission management endpoints

---

## 11. Future Enhancements

### Phase 2 (3-6 months)

**1. Permission History & Audit Log** (5-8 hours)
```
Feature: Track permission grant/revoke history
UI: Timeline showing "Admin X granted Owner preset to User Y for Group Z"
Backend: Add permissions_audit_log table
Benefits: Compliance, troubleshooting, accountability
```

**2. Bulk User Operations** (4-6 hours)
```
Feature: Grant same permissions to multiple users at once
UI: Multi-select users → Bulk grant → Select group & preset
Backend: Batch grant endpoint with transaction support
Benefits: Onboarding, team management
```

**3. Permission Templates** (6-8 hours)
```
Feature: Save custom permission sets as reusable templates
Example: "Team Lead" = Owner on GroupA + Editor on GroupB + Viewer on GroupC
UI: Template management screen, apply template to user
Backend: Templates table, apply_template use case
Benefits: Consistency, efficiency
```

**4. Delegation: Group Owners Manage Permissions** (10-15 hours)
```
Feature: Allow group owners to grant permissions for their groups
UI: "Share Group" button in group settings
Backend: New permission scope check (can grant if owner OR admin)
Security: Prevent privilege escalation
Benefits: Self-service, reduced admin burden
```

### Phase 3 (6-12 months)

**5. Time-Limited Permissions** (8-12 hours)
```
Feature: Set expiration dates for permissions
Example: "Grant Editor access for 30 days"
UI: Date picker in grant permission dialog
Backend: expires_at column, background job to revoke expired
Benefits: Temporary collaborators, contractors
```

**6. Permission Request Workflow** (15-20 hours)
```
Feature: Users request permissions, admins approve/deny
UI: "Request Access" button → Admin notification → Approve/Deny
Backend: permission_requests table, notification system
Benefits: Self-service, audit trail
```

**7. Analytics Dashboard** (10-15 hours)
```
Feature: Visualize permission usage patterns
Metrics:
- Most granted permissions
- Users with most permissions
- Groups with most collaborators
- Permission grant trends over time
UI: Charts and graphs
Backend: Aggregation queries, caching
Benefits: Insights, security monitoring
```

---

## 12. Risk Assessment

| Risk | Impact | Likelihood | Mitigation | Contingency |
|------|--------|------------|------------|-------------|
| **Preset detection is incorrect** | Medium | Low | Comprehensive unit tests, preset validation logic | Allow manual "Force Preset" override |
| **Performance degrades with 100+ groups** | High | Medium | Load testing, implement virtual scrolling, pagination | Add "Load More" button, lazy loading |
| **Bulk grant partially fails** | Medium | Low | Use transactions, proper error handling | Return 207 Multi-Status with details |
| **Concurrent admin edits conflict** | Medium | Medium | Implement optimistic locking, version checks | Show merge conflict UI, refresh option |
| **UI is confusing for non-technical admins** | High | Low | User testing, clear labels, tooltips, documentation | Provide training video, onboarding tour |
| **Breaking changes to existing API** | High | Very Low | New endpoints (non-breaking), integration tests | Keep old endpoints working |
| **Group name changes not reflected** | Low | Medium | Cache invalidation on group updates | Manual refresh button |
| **Permission explosion (1000+ perms)** | Medium | Low | Pagination, virtual scrolling, search | Implement filtering, lazy loading |

---

## 13. Implementation Checklist

### Pre-Implementation

- [ ] Review this plan with team/stakeholders
- [ ] Estimate sprint capacity (10-14 hours over 1-2 sprints)
- [ ] Create feature branch: `git checkout -b feature/hierarchical-permission-ui`
- [ ] Set up tracking (Jira tickets, GitHub project, etc.)

### Phase 1: Backend (3-4 hours)

- [ ] Create `permission_presets.py` module
  - [ ] Define OWNER, EDITOR, VIEWER presets
  - [ ] Implement `detect_preset()` function
  - [ ] Write 5+ unit tests
- [ ] Implement `GetUserPermissionsGroupedUseCase`
  - [ ] Create use case class
  - [ ] Implement grouping logic
  - [ ] Add group name lookup
  - [ ] Write 15+ unit tests
- [ ] Implement `BulkGrantGroupPermissionsUseCase`
  - [ ] Create command DTO
  - [ ] Implement preset mapping
  - [ ] Write 10+ unit tests
- [ ] Implement `RevokeAllGroupPermissionsUseCase`
  - [ ] Filter by group_id logic
  - [ ] Write 5+ unit tests
- [ ] Create API endpoints in `admin.py`
  - [ ] `GET /admin/users/{user_id}/permissions/grouped`
  - [ ] `POST /admin/users/{user_id}/groups/{group_id}/permissions`
  - [ ] `DELETE /admin/users/{user_id}/groups/{group_id}/permissions`
  - [ ] `GET /admin/groups/search`
  - [ ] Write integration tests for all endpoints
- [ ] Run backend tests: `cd backend && make test`
- [ ] Manual API testing with Postman/Hurl

### Phase 2: Frontend Data Layer (2-3 hours)

- [ ] Create `permissionHelpers.ts`
  - [ ] Implement parsing functions
  - [ ] Write 10+ unit tests
- [ ] Create `permissionPresets.ts`
  - [ ] Define presets
  - [ ] Implement `detectPreset()`
  - [ ] Write 5+ unit tests
- [ ] Create React Query hooks
  - [ ] `useGroupedPermissions.ts`
  - [ ] `useBulkGrantPermissions.ts`
  - [ ] `useRevokeGroupPermissions.ts`
  - [ ] `useGroupSearch.ts`
  - [ ] Mock tests for each hook
- [ ] Add TypeScript types in `types/permissions.ts`
- [ ] Run frontend tests: `cd frontend && npm test`

### Phase 3: Frontend UI (3-4 hours)

- [ ] Create `GroupPermissionSection.tsx`
  - [ ] Implement header with preset dropdown
  - [ ] Implement permission checkboxes by category
  - [ ] Add "Remove All" button with confirmation
  - [ ] Add expand/collapse behavior
  - [ ] Write component tests
- [ ] Create `UngroupedPermissionsSection.tsx`
  - [ ] Display ungrouped permissions
  - [ ] Grant/revoke controls
  - [ ] Write component tests
- [ ] Create `AddGroupPermissionsButton.tsx`
  - [ ] Group search dropdown
  - [ ] Preset selector
  - [ ] Grant confirmation
  - [ ] Write component tests
- [ ] Refactor `PermissionManagerDialog.tsx`
  - [ ] Integrate `useGroupedPermissions` hook
  - [ ] Replace flat list with grouped sections
  - [ ] Add search filtering
  - [ ] Handle preset changes
  - [ ] Implement optimistic updates
  - [ ] Write integration tests
- [ ] Test in browser with dev server
- [ ] Fix styling/layout issues
- [ ] Test mobile responsiveness

### Phase 4: Testing & Polish (2-3 hours)

- [ ] Write E2E tests (`hierarchical-permissions.spec.ts`)
  - [ ] Test grant Owner preset
  - [ ] Test change preset
  - [ ] Test toggle individual permission
  - [ ] Test add new group permissions
  - [ ] Test remove all permissions
  - [ ] Test grant notify permission
  - [ ] Test search filtering
- [ ] Run E2E tests: `cd frontend && npm run test:e2e`
- [ ] Manual testing with different scenarios
  - [ ] User with 0 groups
  - [ ] User with 1 group
  - [ ] User with 10+ groups
  - [ ] User with mixed presets
  - [ ] User with notify permission
- [ ] Performance testing
  - [ ] Test with 100 groups
  - [ ] Measure API response times
  - [ ] Check for UI lag/jank
- [ ] Accessibility testing
  - [ ] Keyboard navigation
  - [ ] Screen reader compatibility
  - [ ] Color contrast
- [ ] UI polish
  - [ ] Add loading skeletons
  - [ ] Add success animations
  - [ ] Improve error messages
  - [ ] Add tooltips
  - [ ] Test dark mode
- [ ] Documentation
  - [ ] Update API docs
  - [ ] Update component README
  - [ ] Add inline code comments
  - [ ] Update this plan with actual timings

### Deployment

- [ ] Code review
  - [ ] Self-review all changes
  - [ ] Request peer review
  - [ ] Address feedback
- [ ] Pre-deployment checks
  - [ ] All tests passing (backend + frontend + E2E)
  - [ ] No linting errors
  - [ ] Type checking passes
  - [ ] Build succeeds
- [ ] Deploy backend
  - [ ] Build Docker image
  - [ ] Push to registry
  - [ ] Update production containers
  - [ ] Verify health checks
- [ ] Deploy frontend
  - [ ] Build production bundle
  - [ ] Push to registry
  - [ ] Update production containers
  - [ ] Clear CDN cache
- [ ] Post-deployment verification
  - [ ] Test on production (staging first)
  - [ ] Smoke test all flows
  - [ ] Monitor error logs
  - [ ] Check performance metrics
- [ ] Announce to team
  - [ ] Demo new feature
  - [ ] Share documentation
  - [ ] Collect feedback

### Post-Launch

- [ ] Monitor for 1 week
  - [ ] Check error rates
  - [ ] Review user feedback
  - [ ] Fix any bugs
- [ ] Retrospective
  - [ ] What went well?
  - [ ] What could be improved?
  - [ ] Update this plan with lessons learned
- [ ] Plan Phase 2 enhancements (if applicable)

---

## 14. Lessons Learned (To Be Completed Post-Implementation)

### What Went Well

*[Fill in after implementation]*

### Challenges Encountered

*[Fill in after implementation]*

### Unexpected Benefits

*[Fill in after implementation]*

### If We Did This Again

*[Fill in after implementation]*

---

## 15. Appendix

### A. API Endpoint Reference

#### GET /admin/users/{user_id}/permissions/grouped

**Description:** Get user's permissions organized by group

**Auth:** Requires admin role

**Response:** 200 OK
```json
{
  "groups": [
    {
      "group_id": "550e8400-...",
      "group_name": "My Christmas Group",
      "preset": "owner",
      "permissions": [...],
      "permission_count": 14,
      "has_notify": false
    }
  ],
  "ungrouped_permissions": [...]
}
```

#### POST /admin/users/{user_id}/groups/{group_id}/permissions

**Description:** Bulk grant permissions for a group

**Auth:** Requires admin role

**Request:**
```json
{
  "preset": "owner",
  "include_notify": false,
  "custom_permissions": []
}
```

**Response:** 201 Created
```json
{
  "granted_count": 14,
  "permission_codes": [...]
}
```

#### DELETE /admin/users/{user_id}/groups/{group_id}/permissions

**Description:** Revoke all permissions for a group

**Auth:** Requires admin role

**Response:** 204 No Content

#### GET /admin/groups/search?q={query}&limit={10}

**Description:** Search groups by name

**Auth:** Requires admin role

**Response:** 200 OK
```json
{
  "results": [
    {
      "id": "550e8400-...",
      "name": "My Christmas Group",
      "admin_user_id": "user-123",
      "created_at": "2025-12-01T10:00:00Z"
    }
  ]
}
```

### B. Permission Preset Details

| Preset | Permissions Count | Use Case |
|--------|------------------|----------|
| **Owner** | 14 | Full control, group creator default |
| **Editor** | 13 | Can modify but not delete group |
| **Viewer** | 5 | Read-only access to all resources |
| **Custom** | Varies | Individual permission selection |

**Owner Permissions:**
- Groups: read, update, delete
- Members: read, create, update, delete
- Draws: read, create, finalize, view_assignments
- Exclusions: read, create, delete

**Editor Permissions:**
- Same as Owner, except: ~~groups:delete~~

**Viewer Permissions:**
- Groups: read
- Members: read
- Draws: read, view_assignments
- Exclusions: read

**Notify Permission (Privileged):**
- `draws:notify:{group_id}` - Must be explicitly granted by admin

### C. Component Props Reference

#### GroupPermissionSection

```typescript
interface GroupPermissionSectionProps {
  groupId: string;
  groupName: string;
  permissions: {
    groups: { read: boolean; update: boolean; delete: boolean };
    members: { read: boolean; create: boolean; update: boolean; delete: boolean };
    draws: { read: boolean; create: boolean; finalize: boolean; view_assignments: boolean; notify: boolean };
    exclusions: { read: boolean; create: boolean; delete: boolean };
  };
  preset: 'owner' | 'editor' | 'viewer' | 'custom' | null;
  onPresetChange: (preset: 'owner' | 'editor' | 'viewer') => Promise<void>;
  onPermissionToggle: (category: string, action: string, value: boolean) => Promise<void>;
  onRemoveAll: () => Promise<void>;
  isExpanded: boolean;
  onToggleExpand: () => void;
  isLoading?: boolean;
}
```

---

**Document Version:** 1.0
**Created:** 2025-12-20
**Author:** Gift Genie Development Team
**Status:** Ready for Implementation
**Estimated Effort:** 10-14 hours
