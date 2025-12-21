# E2E Permission System Testing Plan

## 1. Problem Statement & Objectives

### Current Gap
Gift Genie has a fully functional permission system with:
- Backend API endpoints for permission management
- Frontend admin dashboard UI for granting/revoking permissions
- Permission checks in use cases
- Route-level authorization (AdminRoute)

However, there are **no end-to-end tests** validating that these components work together correctly in a real browser environment. This creates risk that:
1. Permission workflows may break without detection
2. UI/UX issues in admin dashboard may go unnoticed
3. Authorization checks may fail silently
4. Integration between frontend/backend may have gaps

### Objectives
Create comprehensive E2E tests using Playwright to:
1. **Verify Admin UI workflows**: Admin can grant/revoke permissions through the UI
2. **Test access control**: Verify regular users cannot access admin features
3. **Validate permission enforcement**: Confirm permission checks work end-to-end
4. **Test edge cases**: Handle errors, duplicate grants, invalid users
5. **Ensure UX quality**: Verify loading states, error messages, success feedback
6. **Prevent regressions**: Catch breaking changes before production

## 2. Technical Approach

### Testing Architecture

We'll use the existing Playwright setup with a new test project structure:

```
frontend/e2e/
├── admin/
│   ├── admin-dashboard-access.spec.ts      # Access control tests
│   ├── permission-management.spec.ts       # Grant/revoke workflows
│   └── permission-enforcement.spec.ts      # Permission checks in action
├── page-objects/
│   └── AdminDashboardPage.ts               # Page object for admin UI
└── helpers.ts                               # Extended with admin helpers
```

### Test User Strategy

We'll need **three types of test users**:

1. **Admin User**: Has `role: 'admin'`, can access admin dashboard
2. **Regular User**: Has `role: 'user'`, has default permissions
3. **Test Target User**: Regular user whose permissions we'll modify in tests

### Trade-offs Analysis

| Approach | Pros | Cons | Verdict |
|----------|------|------|---------|
| **Per-test user creation** | Isolated tests, no state pollution | Slower, more DB writes | ✅ **Selected** - Best for reliability |
| **Shared test users** | Faster, fewer resources | State pollution between tests, race conditions | ❌ Flaky tests |
| **API-only tests** | Fast, simple | Doesn't test UI/UX, misses integration issues | ❌ Not true E2E |
| **UI-only tests (mocked API)** | Fast, isolated frontend | Doesn't catch API contract issues | ❌ Not true E2E |

**Decision**: Use per-test user creation with cleanup to ensure isolation and reliability.

## 3. Test Scenarios

### Scenario 1: Admin Dashboard Access Control

**Purpose**: Verify only admin users can access the admin dashboard

**Test Cases**:
1. ✅ Admin user can navigate to `/app/admin`
2. ✅ Admin user sees user list and groups tabs
3. ✅ Regular user redirected when accessing `/app/admin`
4. ✅ Regular user doesn't see "Admin" link in navigation
5. ✅ Unauthenticated user redirected to login

**Acceptance Criteria**:
- Admin users see full admin dashboard
- Non-admin users receive 403 or are redirected
- Navigation UI respects role-based visibility

---

### Scenario 2: Permission Grant Workflow

**Purpose**: Test complete flow of granting a permission to a user

**Test Cases**:
1. ✅ Admin opens permission management dialog for a user
2. ✅ Admin sees list of available permissions (categorized)
3. ✅ Admin sees current permissions for user
4. ✅ Admin grants a new permission (e.g., `draws:notify`)
5. ✅ Success message appears
6. ✅ Permission appears in user's permission list immediately
7. ✅ Permission count updates in users table
8. ✅ Attempting to grant duplicate permission shows error

**Acceptance Criteria**:
- Permission successfully granted via API
- UI updates reflect changes immediately
- Error handling works for edge cases

---

### Scenario 3: Permission Revoke Workflow

**Purpose**: Test complete flow of revoking a permission from a user

**Test Cases**:
1. ✅ Admin opens permission management dialog for user with permissions
2. ✅ Admin sees user's current permissions
3. ✅ Admin revokes a permission
4. ✅ Confirmation prompt appears (if implemented)
5. ✅ Success message appears
6. ✅ Permission removed from user's list immediately
7. ✅ Permission count updates in users table
8. ✅ Revoking non-existent permission is idempotent (no error)

**Acceptance Criteria**:
- Permission successfully revoked via API
- UI updates reflect changes immediately
- User experience is clear and prevents accidents

---

### Scenario 4: Permission Enforcement - Draw Notifications

**Purpose**: Verify permission checks work end-to-end for `draws:notify`

**Test Cases**:
1. ✅ User **without** `draws:notify` attempts to send notifications → denied
2. ✅ Admin grants `draws:notify` to user
3. ✅ User **with** `draws:notify` can send notifications → succeeds
4. ✅ Admin revokes `draws:notify`
5. ✅ User can no longer send notifications → denied again

**Acceptance Criteria**:
- Permission checks prevent unauthorized actions
- Granting permission immediately enables feature
- Revoking permission immediately disables feature

---

### Scenario 5: Admin Role Bypass

**Purpose**: Verify admin users bypass permission checks

**Test Cases**:
1. ✅ Admin user (role='admin') has no explicit permissions in DB
2. ✅ Admin can send draw notifications without `draws:notify` permission
3. ✅ Admin can access all features regardless of explicit permissions
4. ✅ Admin dashboard shows "All (Admin)" for admin users

**Acceptance Criteria**:
- Admin role provides automatic access to all features
- No need to grant explicit permissions to admins
- UI clearly indicates admin privilege level

---

### Scenario 6: User Search and Pagination

**Purpose**: Test admin dashboard navigation and filtering

**Test Cases**:
1. ✅ Admin sees paginated user list (10 per page)
2. ✅ Admin can navigate between pages
3. ✅ Admin can search users by name or email
4. ✅ Search filters results correctly
5. ✅ Pagination resets when searching

**Acceptance Criteria**:
- Large user lists load efficiently
- Search provides fast, accurate filtering
- Pagination works correctly with search

---

### Scenario 7: Error Handling

**Purpose**: Verify graceful error handling in permission management

**Test Cases**:
1. ✅ Granting invalid permission code shows error
2. ✅ Network error during grant shows retry option
3. ✅ Permission dialog handles user not found
4. ✅ API errors display user-friendly messages
5. ✅ Loading states show during async operations

**Acceptance Criteria**:
- All error cases handled gracefully
- User receives clear, actionable feedback
- No UI crashes or blank states

---

### Scenario 8: Permission Categories and Filtering

**Purpose**: Test permission organization and filtering in UI

**Test Cases**:
1. ✅ Available permissions grouped by category (draws, groups, admin, etc.)
2. ✅ Admin can filter permissions by category
3. ✅ User's current permissions show category badges
4. ✅ Permission descriptions are visible and helpful

**Acceptance Criteria**:
- Permissions organized logically
- Easy to find specific permissions
- Descriptions help admins make informed decisions

---

## 4. Implementation Phases

### Phase 1: Setup and Page Objects (2-3 hours)

**Deliverables**:
1. Create `AdminDashboardPage.ts` page object
2. Add admin helper functions to `helpers.ts`:
   - `createAdminUser()` - Create and login admin user
   - `createRegularUser()` - Create regular user for testing
   - `grantPermissionViaAPI()` - Directly grant permission via API
   - `revokePermissionViaAPI()` - Directly revoke permission via API
3. Set up test data factories for permissions

**Key Files**:
- `frontend/e2e/page-objects/AdminDashboardPage.ts`
- `frontend/e2e/helpers.ts` (extend existing)

**Page Object Methods**:
```typescript
class AdminDashboardPage {
  async goto(): Promise<void>
  async waitForLoad(): Promise<void>
  async searchUsers(query: string): Promise<void>
  async clickManagePermissions(userId: string): Promise<void>
  async selectPermission(permissionCode: string): Promise<void>
  async grantPermission(): Promise<void>
  async revokePermission(permissionCode: string): Promise<void>
  async expectPermissionVisible(code: string): Promise<void>
  async expectPermissionCount(userId: string, count: number): Promise<void>
  async expectErrorMessage(message: string): Promise<void>
}
```

---

### Phase 2: Access Control Tests (2-3 hours)

**Deliverables**:
1. `admin-dashboard-access.spec.ts` - Test who can access admin features
2. Tests for admin user access
3. Tests for regular user denial
4. Tests for navigation visibility

**Key Test Structure**:
```typescript
test.describe('Admin Dashboard Access Control', () => {
  test('admin user can access dashboard', async ({ page }) => {
    // Create admin user
    // Login as admin
    // Navigate to /app/admin
    // Verify dashboard visible
  });

  test('regular user cannot access dashboard', async ({ page }) => {
    // Create regular user
    // Login as user
    // Attempt to navigate to /app/admin
    // Verify redirected or see 403
  });
});
```

---

### Phase 3: Permission Management Tests (4-5 hours)

**Deliverables**:
1. `permission-management.spec.ts` - Test grant/revoke workflows
2. Tests for granting permissions
3. Tests for revoking permissions
4. Tests for error cases (duplicate grant, invalid permission)
5. Tests for UI feedback (success messages, loading states)

**Key Test Structure**:
```typescript
test.describe('Permission Management', () => {
  test('admin can grant permission to user', async ({ page }) => {
    // Setup: Create admin + regular user
    // Navigate to admin dashboard
    // Open permission dialog for regular user
    // Grant permission
    // Verify success message
    // Verify permission appears in list
  });

  test('admin can revoke permission from user', async ({ page }) => {
    // Setup: Create admin + regular user with permission
    // Navigate to admin dashboard
    // Open permission dialog
    // Revoke permission
    // Verify permission removed
  });
});
```

---

### Phase 4: Permission Enforcement Tests (3-4 hours)

**Deliverables**:
1. `permission-enforcement.spec.ts` - Test permission checks in real features
2. Tests for `draws:notify` permission
3. Tests for admin role bypass
4. Tests for permission state changes

**Key Test Structure**:
```typescript
test.describe('Permission Enforcement', () => {
  test('user without draws:notify cannot send notifications', async ({ page }) => {
    // Create user without permission
    // Create group + draw
    // Attempt to send notifications
    // Verify denied (button disabled or error)
  });

  test('user with draws:notify can send notifications', async ({ page }) => {
    // Create user with permission
    // Create group + draw
    // Send notifications
    // Verify success
  });
});
```

---

### Phase 5: Search, Pagination, and UX Tests (2-3 hours)

**Deliverables**:
1. Tests for user search functionality
2. Tests for pagination
3. Tests for loading states
4. Tests for empty states

**Key Test Structure**:
```typescript
test.describe('Admin Dashboard UX', () => {
  test('search filters users correctly', async ({ page }) => {
    // Create multiple users
    // Login as admin
    // Search for specific user
    // Verify results filtered
  });
});
```

---

### Phase 6: Error Handling and Edge Cases (2-3 hours)

**Deliverables**:
1. Tests for network errors
2. Tests for invalid inputs
3. Tests for concurrent operations
4. Tests for permission dialog edge cases

---

### Phase 7: CI Integration and Documentation (1-2 hours)

**Deliverables**:
1. Ensure tests run in CI pipeline
2. Update `frontend/e2e/README.md` with permission test documentation
3. Add test data cleanup scripts if needed
4. Document test user setup for local development

---

## 5. Test Data Management

### User Roles and Permissions

**Admin User**:
```typescript
{
  email: "admin-{timestamp}@example.com",
  password: "AdminPass123!",
  role: "admin"
  // No explicit permissions needed (bypass via role)
}
```

**Regular User (Default)**:
```typescript
{
  email: "user-{timestamp}@example.com",
  password: "UserPass123!",
  role: "user",
  permissions: [
    "groups:create",
    "groups:read",
    "groups:update",
    "groups:delete",
    "members:create",
    "members:read",
    "members:update",
    "members:delete",
    "draws:create",
    "draws:read",
    "draws:finalize",
    "draws:view_assignments",
    "exclusions:create",
    "exclusions:read",
    "exclusions:delete"
  ]
}
```

**Regular User (No draws:notify)**:
```typescript
{
  // Same as default, minus draws:notify
  permissions: [...default permissions]
  // draws:notify explicitly NOT included
}
```

### Cleanup Strategy

**Per-test cleanup**:
```typescript
test.afterEach(async ({ page }) => {
  // Option 1: Delete test users created during test
  await cleanupTestUsers(page);
  
  // Option 2: Database transaction rollback (if supported)
  // await rollbackTestTransaction();
});
```

**Naming convention** for easy cleanup:
- All test users: `e2e-test-{testName}-{timestamp}@example.com`
- Allows batch cleanup: `DELETE FROM users WHERE email LIKE 'e2e-test-%'`

---

## 6. Page Object Design

### AdminDashboardPage

```typescript
export class AdminDashboardPage {
  constructor(private readonly page: Page) {}

  // Navigation
  async goto() {
    await this.page.goto('/app/admin');
  }

  async waitForLoad() {
    await this.page.waitForSelector('[data-testid="admin-dashboard"]');
  }

  // User table interactions
  async searchUsers(query: string) {
    await this.page.fill('[data-testid="user-search-input"]', query);
    await this.page.waitForLoadState('networkidle');
  }

  async clickManagePermissions(userId: string) {
    await this.page.click(`[data-testid="manage-permissions-${userId}"]`);
    await this.page.waitForSelector('[data-testid="permission-dialog"]');
  }

  async selectPermissionCategory(category: string) {
    await this.page.selectOption('[data-testid="permission-category-filter"]', category);
  }

  // Permission management
  async grantPermission(permissionCode: string) {
    await this.page.click(`[data-testid="grant-permission-${permissionCode}"]`);
    await this.page.waitForResponse(resp => resp.url().includes('/permissions') && resp.status() === 201);
  }

  async revokePermission(permissionCode: string) {
    await this.page.click(`[data-testid="revoke-permission-${permissionCode}"]`);
    await this.page.waitForResponse(resp => resp.url().includes('/permissions') && resp.status() === 204);
  }

  async closePermissionDialog() {
    await this.page.click('[data-testid="close-permission-dialog"]');
  }

  // Assertions
  async expectUserInTable(email: string) {
    await expect(this.page.locator(`text=${email}`)).toBeVisible();
  }

  async expectPermissionCount(userId: string, count: number) {
    const text = count === 'All' ? 'All (Admin)' : count.toString();
    await expect(
      this.page.locator(`[data-testid="permission-count-${userId}"]`)
    ).toContainText(text);
  }

  async expectPermissionInList(code: string) {
    await expect(
      this.page.locator(`[data-testid="user-permission-${code}"]`)
    ).toBeVisible();
  }

  async expectPermissionNotInList(code: string) {
    await expect(
      this.page.locator(`[data-testid="user-permission-${code}"]`)
    ).not.toBeVisible();
  }

  async expectSuccessMessage(message: string) {
    await expect(this.page.locator('.toast-success')).toContainText(message);
  }

  async expectErrorMessage(message: string) {
    await expect(this.page.locator('.toast-error')).toContainText(message);
  }
}
```

---

## 7. Required UI Updates

To make tests stable and maintainable, we need to add `data-testid` attributes to key UI elements:

### AdminDashboard.tsx
```typescript
// Container
<div data-testid="admin-dashboard">

// User search
<Input data-testid="user-search-input" />

// Manage permissions button
<Button data-testid={`manage-permissions-${user.id}`}>Manage</Button>

// Permission count
<span data-testid={`permission-count-${user.id}`}>{count}</span>
```

### PermissionManagerDialog.tsx
```typescript
// Dialog container
<Dialog data-testid="permission-dialog">

// Permission list items
<div data-testid={`user-permission-${permission.code}`}>

// Grant button
<Button data-testid={`grant-permission-${permission.code}`}>Grant</Button>

// Revoke button
<Button data-testid={`revoke-permission-${permission.code}`}>Revoke</Button>

// Close button
<Button data-testid="close-permission-dialog">Close</Button>
```

**Implementation Task**: Add these `data-testid` attributes before writing tests.

---

## 8. Risk Assessment & Mitigation

| Risk | Impact | Likelihood | Mitigation |
|------|--------|------------|------------|
| **Test flakiness due to async operations** | High | Medium | Use Playwright's auto-waiting, explicit `waitForResponse()`, avoid `waitForTimeout()` |
| **Test data pollution** | Medium | Medium | Per-test user creation with unique emails, cleanup in afterEach hooks |
| **CI/CD timing issues** | Medium | High | Increase timeouts for CI, use `page.waitForLoadState('networkidle')` |
| **Permission state leaking between tests** | High | Low | Isolated test users, no shared state, database cleanup |
| **UI changes breaking tests** | Medium | High | Use `data-testid` instead of text/CSS selectors, maintain page objects |
| **Missing test coverage** | Medium | Medium | Code review checklist, coverage reports, regular test audits |
| **Backend API changes** | High | Low | E2E tests catch breaking changes early, version API contracts |

---

## 9. Success Criteria

### Functional Coverage
- ✅ All 8 test scenarios have passing E2E tests
- ✅ Admin access control verified
- ✅ Permission grant/revoke workflows tested
- ✅ Permission enforcement validated end-to-end
- ✅ Error cases handled gracefully
- ✅ Search and pagination work correctly

### Quality Metrics
- ✅ Tests pass consistently (>95% success rate in CI)
- ✅ Test execution time: <5 minutes for full suite
- ✅ Zero test data pollution (clean state after each test)
- ✅ Page objects cover all critical interactions
- ✅ No hardcoded waits (`waitForTimeout`) in tests

### Non-Functional
- ✅ Tests run in CI/CD pipeline
- ✅ Test failures provide clear, actionable error messages
- ✅ Documentation updated with permission test examples
- ✅ Team can easily add new permission tests

---

## 10. Estimated Complexity & Timeline

### Phase-by-Phase Breakdown

| Phase | Description | Estimated Hours | Dependencies |
|-------|-------------|-----------------|--------------|
| **Phase 1** | Setup & Page Objects | 2-3h | None |
| **Phase 2** | Access Control Tests | 2-3h | Phase 1 |
| **Phase 3** | Permission Management Tests | 4-5h | Phase 1 |
| **Phase 4** | Permission Enforcement Tests | 3-4h | Phase 1, Phase 3 |
| **Phase 5** | Search & Pagination Tests | 2-3h | Phase 1 |
| **Phase 6** | Error Handling Tests | 2-3h | Phase 1 |
| **Phase 7** | CI Integration & Docs | 1-2h | All phases |
| **Total** | | **16-23 hours** | |

### Realistic Timeline
- **Optimistic**: 16 hours (2 work days, no blockers)
- **Realistic**: 20 hours (2.5 work days, minor issues)
- **Pessimistic**: 23 hours (3 work days, UI changes needed)

**Recommendation**: Plan for **20-22 hours** (3 work days for single developer)

---

## 11. Next Steps

### Immediate Actions
1. ✅ **Review and approve this plan** with stakeholders
2. ✅ **Add `data-testid` attributes** to AdminDashboard and PermissionManagerDialog components
3. ✅ **Create AdminDashboardPage** page object
4. ✅ **Extend helpers.ts** with admin user creation functions

### Implementation Order
1. **Phase 1**: Set up infrastructure (page objects, helpers)
2. **Phase 2**: Write access control tests (quick wins)
3. **Phase 3**: Write permission management tests (core functionality)
4. **Phase 4**: Write enforcement tests (end-to-end validation)
5. **Phases 5-6**: Write UX and error tests (polish)
6. **Phase 7**: Integrate with CI and document

### Definition of Done
- [ ] All 8 test scenarios have E2E tests
- [ ] Tests pass in local environment
- [ ] Tests pass in CI environment
- [ ] Test execution time < 5 minutes
- [ ] Page objects documented
- [ ] README updated with permission test examples
- [ ] Code reviewed and approved
- [ ] No known flaky tests

---

## 12. Open Questions

**For Discussion**:

1. **Permission enforcement scope**: Should we test ALL permissions (23 total) or focus on representative samples (e.g., `draws:notify`, `groups:delete`)?
   - *Recommendation*: Test 3-4 representative permissions to validate the system works, not every single permission.

2. **Test user cleanup**: Should we delete test users after each test, or use a separate test database that's wiped periodically?
   - *Recommendation*: Per-test cleanup for reliability, with scheduled DB wipes as backup.

3. **CI test parallelization**: Should permission tests run in parallel with other E2E tests, or sequentially?
   - *Recommendation*: Parallel execution with isolated test users (no shared state).

4. **Screenshot/video on failure**: Should we capture screenshots for all permission test failures?
   - *Recommendation*: Yes, already configured in Playwright config (`screenshot: 'only-on-failure'`).

5. **Performance benchmarks**: Should we measure and assert on page load times in E2E tests?
   - *Recommendation*: Not for initial implementation; add later if performance issues arise.

---

**Document Version**: 1.0  
**Last Updated**: 2025-12-18  
**Author**: Gift Genie Development Team  
**Status**: Planning - Ready for Implementation
