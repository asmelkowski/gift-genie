# Resource-Level Permissions Guide

## 1. Overview

Gift Genie uses a resource-level permissions system where permissions are scoped to specific resources using the format:

```
permission:resource_id
```

**Examples:**
- `groups:read:550e8400-e29b-41d4-a716-446655440000`
- `members:create:550e8400-e29b-41d4-a716-446655440000`
- `draws:finalize:550e8400-e29b-41d4-a716-446655440000`

This provides fine-grained access control where users only have permissions for resources they own or have been explicitly granted access to.

## 2. How It Works

### User Journey

1. **User registers** → Starts with NO permissions (except `groups:create`)
2. **User creates group** → Automatically granted **14 permissions** for that group
3. **User manages resources** → Can manage their group and all child resources (members, draws, exclusions)

### Auto-Granted Permissions

When a user creates a group, they automatically receive these 14 resource-scoped permissions:

**Groups (3 permissions):**
- `groups:read:{group_id}`
- `groups:update:{group_id}`
- `groups:delete:{group_id}`

**Members (4 permissions):**
- `members:read:{group_id}`
- `members:create:{group_id}`
- `members:update:{group_id}`
- `members:delete:{group_id}`

**Draws (4 permissions):**
- `draws:read:{group_id}`
- `draws:create:{group_id}`
- `draws:finalize:{group_id}`
- `draws:view_assignments:{group_id}`

**Exclusions (3 permissions):**
- `exclusions:read:{group_id}`
- `exclusions:create:{group_id}`
- `exclusions:delete:{group_id}`

**Important:** `draws:notify` is **NOT** auto-granted. This is a privileged operation with cost implications (sending emails/SMS) that must be explicitly granted by an admin.

## 3. Permission Scoping

Child resources (members, draws, exclusions) use the **group_id** for permission scoping, not their own IDs:

- `members:read:{group_id}` (not `member_id`)
- `draws:finalize:{group_id}` (not `draw_id`)
- `exclusions:delete:{group_id}` (not `exclusion_id`)

**Why?** This simplifies permission management significantly. Instead of managing hundreds of individual permissions for each member/draw/exclusion, we manage just 15 permissions per group:
- 1x `groups:create` (unscoped)
- 14x resource-scoped permissions (see Auto-Granted Permissions above)

## 4. Frontend Error Handling

The frontend uses intelligent error handling for 403 Forbidden responses based on endpoint type:

**Single Resources (GET /groups/{id}):**
- 403 → Converted to 404 Not Found
- Prevents leaking resource existence to unauthorized users
- Shows user-friendly "not found" message

**List Endpoints (GET /groups):**
- 403 → Returns empty array `[]`
- Users see "No groups yet" instead of error
- Better UX for new users with no permissions

**Configuration:**
See `frontend/src/lib/permissionErrorStrategy.ts` for the complete rules.

## 5. For Developers

### Adding New Permissions

1. **Add to `PermissionRegistry`:**
   ```python
   # backend/src/gift_genie/infrastructure/permissions/permission_registry.py
   class PermissionRegistry:
       NEW_RESOURCE_ACTION = "resource:action"
   ```

2. **Add to auto-grant list** (if applicable):
   ```python
   # backend/src/gift_genie/infrastructure/permissions/group_owner_permissions.py
   GROUP_OWNER_AUTO_GRANT_PERMISSIONS: list[str] = [
       # ... existing permissions
       PermissionRegistry.NEW_RESOURCE_ACTION,
   ]
   ```

3. **Update permission seeds:**
   ```python
   # backend/src/gift_genie/infrastructure/database/seeds/permission_seeds.py
   # Add permission to all_permissions() method
   ```

4. **Run migration:**
   ```bash
   cd backend
   make db-seed
   ```

Permissions are automatically granted on next group creation. Existing groups can be granted permissions manually via admin endpoints.

### Testing

**Backend Tests:**
- 273 tests passing
- Resource permission tests: `backend/tests/test_group_owner_permissions.py`
- Authorization tests: `backend/tests/test_authorization_service.py`

**Frontend Tests:**
- Permission error strategy: `frontend/src/lib/__tests__/permissionErrorStrategy.test.ts`

**E2E Tests:**
- Resource permissions: `frontend/e2e/groups/resource-permissions.spec.ts`
- Tests cover:
  - Auto-grant on group creation
  - Permission isolation between users
  - Empty states for users with no permissions

## 6. Admin Permissions

**Admin Bypass:**
- Users with `UserRole.ADMIN` bypass **all** resource-level permission checks
- Implemented in authorization service via role check
- Admins can access any resource regardless of permissions

**Admin Endpoints:**
- Still require explicit admin role check (not just permissions)
- Example: Admin dashboard requires `ADMIN_VIEW_DASHBOARD` permission AND admin role

**Special Permissions:**
- Admins can grant privileged permissions like `draws:notify:{group_id}`
- Use admin endpoints: `POST /admin/users/{user_id}/permissions`

---

**Quick Reference:**
- Permission format: `resource:action:resource_id`
- 14 auto-granted permissions per group
- Child resources scoped by `group_id`
- Admins bypass all checks
- `draws:notify` requires admin grant
