# E2E Test Failures - Fix Summary

**Date:** December 19, 2025
**Status:** ✅ RESOLVED (11/12 tests passing)

## Problem Summary

7 E2E tests were failing with the error: "element(s) not found" when trying to verify that a created group appeared in the groups list.

### Failing Tests
1. `[authenticated] › e2e/admin/permission-enforcement.spec.ts:43:3` - user without draws:notify cannot send notifications
2. `[authenticated] › e2e/admin/permission-enforcement.spec.ts:172:3` - user with draws:notify can send notifications
3. `[authenticated] › e2e/admin/permission-enforcement.spec.ts:416:3` - admin user bypasses permission checks
4. `[authenticated] › e2e/admin/permission-enforcement.spec.ts:481:3` - permission enforcement works for other permissions (groups:delete)
5. `[authenticated] › e2e/groups/create-group.spec.ts:18:3` - should create a new group ✅ **NOW PASSING**
6. `[authenticated] › e2e/groups/resource-permissions.spec.ts:17:3` - user creates group and can immediately manage members ✅ **NOW PASSING**
7. `[authenticated] › e2e/groups/resource-permissions.spec.ts:50:3` - user cannot access another users group members ❌ **STILL FAILING** (different issue)

## Root Cause

The `user_permissions` table had a **foreign key constraint** on the `permission_code` column:

```python
permission_code: Mapped[str] = mapped_column(
    String(100),
    ForeignKey("permissions.code", ondelete="CASCADE"),  # ❌ THIS WAS THE PROBLEM
    primary_key=True,
)
```

### Why This Failed

1. The resource-level permissions system uses **dynamic permission codes** like:
   - `groups:read:{group_id}`
   - `members:create:{group_id}`
   - `draws:finalize:{group_id}`

2. These resource-scoped permissions are **not stored in the `permissions` table** - they're generated dynamically

3. When a user created a group, the system tried to auto-grant 14 resource-scoped permissions via `grant_permissions_bulk()`

4. The foreign key constraint **failed** because codes like `groups:read:550e8400-...` don't exist in `permissions.code`

5. This raised an `IntegrityError` which was caught and converted to a `ValueError`:
   ```python
   except IntegrityError as e:
       raise ValueError(f"Failed to grant permissions to user {user_id}") from e
   ```

6. The `ValueError` was then caught in the `create_group` endpoint and returned as **400 Bad Request**

7. The frontend mutation failed, the group wasn't visible in the UI, and tests failed

## Solution

### 1. Database Schema Fix

**Migration:** `0f4ce5fbf7f9_remove_fk_user_permissions_permission_code.py`

Removed the foreign key constraint from `user_permissions.permission_code`:

```python
def upgrade() -> None:
    """Remove foreign key constraint from user_permissions.permission_code.

    Resource-scoped permissions (e.g., 'groups:read:{group_id}') are dynamically
    generated and do not exist in the permissions table. The foreign key constraint
    prevents auto-granting these permissions when users create groups.
    """
    op.drop_constraint(
        'user_permissions_permission_code_fkey',
        'user_permissions',
        type_='foreignkey'
    )
```

**Result:** The `user_permissions` table can now store resource-scoped permission codes without requiring them to exist in the `permissions` table.

### 2. E2E Test Fix

**File:** `frontend/e2e/page-objects/GroupsPage.ts`

Fixed test selector that was finding 2 elements (a link and a button) with the same group name:

```typescript
// Before (failed with "strict mode violation"):
async expectGroupVisible(groupName: string) {
    await expect(this.page.getByText(groupName)).toBeVisible();
}

// After (passes):
async expectGroupVisible(groupName: string) {
    await expect(this.page.getByText(groupName).first()).toBeVisible();
}
```

## Verification

### Test Results
```
✅ 11 passed
❌ 1 failed (unrelated issue - Access Denied UI)
⏱️  Total time: 1.1 minutes
```

### Manual Testing
```bash
# Create a test user
curl -X POST http://localhost:8000/api/v1/test/users \
  -H "Content-Type: application/json" \
  -d '{"name":"Test User","email":"test@example.com","password":"Test123!","role":"user"}'

# Response includes access_token

# Create a group (should succeed now)
curl -X POST http://localhost:8000/api/v1/groups \
  -H "Authorization: Bearer {token}" \
  -H "Content-Type: application/json" \
  -d '{"name":"Test Group","historical_exclusions_enabled":true,"historical_exclusions_lookback":1}'

# Response: 201 Created ✅

# Verify permissions were granted
curl -X GET http://localhost:8000/api/v1/admin/users/{user_id}/permissions \
  -H "Authorization: Bearer {admin_token}"

# Should show 14 resource-scoped permissions like:
# - groups:read:{group_id}
# - members:create:{group_id}
# - draws:finalize:{group_id}
# etc.
```

## Impact

### Fixed
✅ Users can now create groups successfully
✅ Auto-grant of resource-scoped permissions works
✅ Group creation E2E tests pass
✅ Resource permissions E2E tests pass
✅ Permission enforcement E2E tests pass

### Remaining Issue

❌ **Test:** "user cannot access another users group members"
**Issue:** The "Access Denied" UI component isn't showing when a user tries to access another user's group members
**Status:** Needs investigation - likely a separate frontend routing/error handling issue
**Priority:** Medium (doesn't block main functionality)

## Files Changed

### Backend
- `backend/alembic/versions/0f4ce5fbf7f9_remove_fk_user_permissions_permission_code.py` - New migration
- `backend/src/gift_genie/infrastructure/database/models/user_permission.py` - Schema documentation (no code changes needed)

### Frontend
- `frontend/e2e/page-objects/GroupsPage.ts` - Fixed test selector

## Lessons Learned

1. **Foreign keys on dynamic data are problematic**: When permission codes are dynamically generated (resource-scoped), they can't have foreign key constraints to a static table

2. **Better error logging is essential**: The original logs didn't show the actual error message, making debugging difficult. Added temporary debug logging to identify the root cause

3. **Test selectors should be specific**: Using `.first()` or more specific selectors prevents "strict mode violation" errors when multiple elements match

4. **Database schema design matters**: The permissions system architecture (base permissions in `permissions` table, resource-scoped permissions stored directly in `user_permissions`) needs to be reflected in the schema constraints

## Recommendations

### Immediate
- [x] Remove foreign key constraint ✅ DONE
- [x] Fix E2E test selectors ✅ DONE
- [ ] Investigate remaining "Access Denied" UI test failure

### Future
- [ ] Add database constraints documentation explaining why `permission_code` doesn't have FK
- [ ] Consider adding a check constraint to validate permission code format (e.g., must match pattern `\w+:\w+(:\w+)?`)
- [ ] Add integration test for permission grants to catch similar issues earlier

## Related Documentation
- `.ai/resource-permissions-guide.md` - Explains the resource-level permissions system
- `backend/src/gift_genie/infrastructure/permissions/group_owner_permissions.py` - Defines auto-granted permissions
- `backend/DRAW_ALGORITHM.md` - Additional system documentation


---

## Update: Second Fix Applied (December 20, 2025)

### Remaining Issue Fixed

The last failing test ("user cannot access another users group members") has been **resolved**.

**Problem:**
The permission error strategy was converting 403 Forbidden responses for `/groups/{id}/members` into an empty list instead of showing an "Access Denied" message.

**Root Cause:**
In `frontend/src/lib/permissionErrorStrategy.ts`, the rule:
```typescript
{
  pattern: /^\/groups\/[^/]+\/(members|draws|exclusions)\/?(\?.*)?$/,
  methods: ['GET'],
  behavior: 'show-empty',  // ❌ Wrong behavior
},
```

Was treating nested resource lists (like `/groups/{id}/members`) the same as the top-level groups list, showing an empty state instead of "Access Denied".

**Solution:**
Changed the behavior from `'show-empty'` to `'show-forbidden'` for nested resource lists. Now:
- `/groups` with 403 → Shows empty list (good UX for users with no groups)
- `/groups/{id}/members` with 403 → Shows "Access Denied" (indicates permission issue)

**Files Changed:**
- `frontend/src/lib/permissionErrorStrategy.ts` - Updated nested resource list behavior
- `frontend/src/pages/MembersPage.tsx` - Extract `groupError` from useGroupDetailsQuery and check for 403
- `frontend/e2e/groups/resource-permissions.spec.ts` - Added `waitForLoadState` after navigation

### Final Test Results
```
✅ 12/12 tests passing
⏱️  Total time: 1.1 minutes
🎉 100% success rate!
```

### All Fixed Tests
1. ✅ user without draws:notify cannot send notifications
2. ✅ user with draws:notify can send notifications
3. ✅ admin user bypasses permission checks
4. ✅ permission enforcement works for other permissions (groups:delete)
5. ✅ should create a new group
6. ✅ user creates group and can immediately manage members
7. ✅ user cannot access another users group members **← JUST FIXED**
8. ✅ new user sees empty groups list
9. ✅ granting draws:notify enables notification feature
10. ✅ revoking draws:notify disables notification feature
11. ✅ permission state transitions work correctly
12. ✅ permission enforcement for groups:delete

### Impact of Second Fix

**Improved UX:**
- Users who try to access unauthorized resources now see a clear "Access Denied" message
- Distinguishes between "no data" and "access denied" states
- Better security - prevents confusion about whether a resource exists

**Maintained Behavior:**
- Top-level `/groups` still shows empty list for users with no groups (good UX)
- Single resource 403s still converted to 404s (prevents resource existence leaking)

## Conclusion

All originally failing E2E tests are now passing. The permission system works correctly:
- ✅ Auto-grant of resource-scoped permissions on group creation
- ✅ Permission enforcement at the API level
- ✅ Proper error handling and UX for unauthorized access
- ✅ Distinct behaviors for different types of resources (lists vs singles vs nested)
