# Quick Start Guide: Groups Page E2E Tests

This guide will help you quickly get started with implementing E2E tests for the Groups page.

## 📋 Prerequisites

- ✅ Playwright installed (`npm install -D @playwright/test`)
- ✅ Backend API running (`http://localhost:8000`)
- ✅ Frontend dev server running (`http://localhost:5173`)
- ✅ Test database configured
- ✅ Test user credentials available

## 🚀 Quick Start (5 Steps)

### Step 1: Add `data-testid` Attributes (30 min)

Follow the checklist in `DATA_TESTID_CHECKLIST.md` to add test IDs to components.

**Start with these critical components:**

```bash
# Edit these files first:
frontend/src/components/GroupsPage/PageHeader.tsx
frontend/src/components/GroupsPage/CreateGroupDialog.tsx
frontend/src/components/GroupsPage/GroupCard.tsx
```

**Example changes:**

```tsx
// PageHeader.tsx
<h1 data-testid="groups-page-header">Groups</h1>
<Button data-testid="create-group-button" onClick={onCreateClick}>
  Create Group
</Button>

// GroupCard.tsx
<div data-testid={`group-card-${group.id}`}>
  <h3 data-testid="group-card-name">{group.name}</h3>
</div>

// CreateGroupDialog.tsx
<Input data-testid="group-name-input" {...props} />
<input data-testid="historical-exclusions-checkbox" type="checkbox" {...props} />
<Button data-testid="submit-create-group" type="submit">Create</Button>
```

### Step 2: Set Up Page Objects (10 min)

The page objects are already created for you:

```bash
# These files are ready to use:
frontend/e2e/page-objects/GroupsPage.ts
frontend/e2e/page-objects/CreateGroupDialog.ts
```

**Verify they exist:**
```bash
ls -la frontend/e2e/page-objects/
```

### Step 3: Create Your First Test File (5 min)

```bash
# Copy the example to create your actual test file:
cd frontend/e2e
cp groups.spec.ts.example groups.spec.ts
```

**Or create from scratch:**

```typescript
// frontend/e2e/groups.spec.ts
import { test, expect } from './fixtures';
import { GroupsPage } from './page-objects/GroupsPage';
import { CreateGroupDialog } from './page-objects/CreateGroupDialog';

test.describe('Groups Page - Smoke Test', () => {
  test('should load groups page successfully', async ({ authenticatedPage }) => {
    const groupsPage = new GroupsPage(authenticatedPage);
    
    await groupsPage.goto();
    await groupsPage.expectPageLoaded();
    
    await expect(authenticatedPage).toHaveURL('/app/groups');
  });
});
```

### Step 4: Run Your First Test (2 min)

```bash
# Start backend (in terminal 1)
cd backend
make dev

# Start frontend (in terminal 2)
cd frontend
npm run dev

# Run E2E test (in terminal 3)
cd frontend
npx playwright test e2e/groups.spec.ts
```

**Expected output:**
```
Running 1 test using 1 worker
  ✓  1 Groups Page - Smoke Test › should load groups page successfully (2.3s)

  1 passed (2.3s)
```

### Step 5: Add More Tests (Ongoing)

Follow the test plan in `GROUPS_PAGE_TEST_PLAN.md` and add tests incrementally.

**Recommended order:**
1. Authentication tests (2 tests)
2. Page load tests (3-5 tests)
3. Create group happy path (2-3 tests)
4. Create group validation (5-10 tests)
5. Search & sort (15+ tests)
6. Pagination (10+ tests)
7. Edge cases (as needed)

---

## 🎯 Your First 5 Tests (30 min)

Here's a practical example to implement your first 5 tests:

```typescript
// frontend/e2e/groups.spec.ts
import { test, expect } from './fixtures';
import { GroupsPage } from './page-objects/GroupsPage';
import { CreateGroupDialog } from './page-objects/CreateGroupDialog';

test.describe('Groups Page - Foundation Tests', () => {
  
  // Test 1: Authentication
  test('should redirect unauthenticated users to login', async ({ page }) => {
    const groupsPage = new GroupsPage(page);
    await groupsPage.goto();
    await expect(page).toHaveURL('/login');
  });

  // Test 2: Authenticated access
  test('should allow authenticated users to access page', async ({ authenticatedPage }) => {
    const groupsPage = new GroupsPage(authenticatedPage);
    await groupsPage.goto();
    await groupsPage.expectPageLoaded();
  });

  // Test 3: Page structure
  test('should display page header and create button', async ({ authenticatedPage }) => {
    const groupsPage = new GroupsPage(authenticatedPage);
    await groupsPage.goto();
    
    await expect(groupsPage.pageHeader).toBeVisible();
    await expect(groupsPage.createGroupButton).toBeVisible();
  });

  // Test 4: Open create dialog
  test('should open create group dialog', async ({ authenticatedPage }) => {
    const groupsPage = new GroupsPage(authenticatedPage);
    const createDialog = new CreateGroupDialog(authenticatedPage);
    
    await groupsPage.goto();
    await groupsPage.clickCreateGroupButton();
    
    await createDialog.expectVisible();
  });

  // Test 5: Create group (happy path)
  test('should create a new group successfully', async ({ authenticatedPage }) => {
    const groupsPage = new GroupsPage(authenticatedPage);
    const createDialog = new CreateGroupDialog(authenticatedPage);
    
    await groupsPage.goto();
    await groupsPage.clickCreateGroupButton();
    
    const groupName = `E2E Test Group ${Date.now()}`;
    await createDialog.createGroup(groupName, {
      historicalExclusionsEnabled: true,
      lookback: 2,
    });
    
    // Verify success
    await expect(authenticatedPage.getByText('Group created successfully')).toBeVisible();
    await expect(authenticatedPage).toHaveURL(/\/app\/groups\/.*\/members/);
  });
});
```

**Run these tests:**
```bash
npx playwright test e2e/groups.spec.ts
```

---

## 🐛 Troubleshooting

### Issue: "Error: locator.click: Target closed"
**Solution:** The page is navigating before the click completes. Use `await page.waitForLoadState()` after navigation.

### Issue: "Timeout waiting for element"
**Solution:** 
1. Check if `data-testid` is added correctly
2. Verify element is actually rendered
3. Check if auth is working
4. Use `--debug` flag to see what's happening

```bash
npx playwright test --debug
```

### Issue: "Cannot find module './page-objects/GroupsPage'"
**Solution:** Check TypeScript config and file paths. Try:
```bash
npx tsc --noEmit  # Check for TS errors
```

### Issue: "Test is flaky"
**Solution:**
1. Avoid `page.waitForTimeout()` - use Playwright's auto-waiting
2. Wait for network: `await page.waitForLoadState('networkidle')`
3. Use explicit assertions: `await expect(element).toBeVisible()`

### Issue: "401 Unauthorized in tests"
**Solution:** Check that:
1. Test user exists in database
2. Credentials in `fixtures.ts` are correct
3. Backend is running
4. CSRF tokens are working

---

## 📚 Reference Documents

| Document | Purpose |
|----------|---------|
| `GROUPS_PAGE_TEST_PLAN.md` | Comprehensive test plan with all test cases |
| `GROUPS_E2E_SUMMARY.md` | High-level overview and implementation phases |
| `DATA_TESTID_CHECKLIST.md` | Checklist for adding test IDs to components |
| `groups.spec.ts.example` | Example test implementation |
| `page-objects/GroupsPage.ts` | Main page object |
| `page-objects/CreateGroupDialog.ts` | Dialog page object |

---

## 🎓 Learning Resources

### Playwright Docs
- [Getting Started](https://playwright.dev/docs/intro)
- [Writing Tests](https://playwright.dev/docs/writing-tests)
- [Locators](https://playwright.dev/docs/locators)
- [Assertions](https://playwright.dev/docs/test-assertions)
- [Page Object Model](https://playwright.dev/docs/pom)

### Useful Commands
```bash
# Run all tests
npx playwright test

# Run specific test file
npx playwright test e2e/groups.spec.ts

# Run in headed mode (see browser)
npx playwright test --headed

# Run in debug mode (step through)
npx playwright test --debug

# Run with UI mode (interactive)
npx playwright test --ui

# Generate test code (codegen)
npx playwright codegen http://localhost:5173/app/groups

# View test report
npx playwright show-report

# Update snapshots
npx playwright test --update-snapshots
```

---

## ✅ Success Checklist

After completing the quick start, you should have:

- [ ] Added `data-testid` to at least 5 key components
- [ ] Created `groups.spec.ts` test file
- [ ] Written and run at least 5 passing tests
- [ ] Verified tests run in CI/CD (if applicable)
- [ ] Understood the page object pattern
- [ ] Know how to debug failing tests
- [ ] Ready to add more tests incrementally

---

## 🚦 Next Steps

### Week 1: Foundation
- [ ] Complete all `data-testid` additions
- [ ] Implement authentication tests (2)
- [ ] Implement page load tests (5)
- [ ] Implement basic create group tests (5)
- [ ] Get tests running in CI

### Week 2: Core Features
- [ ] Implement all create group tests (12)
- [ ] Implement search tests (10)
- [ ] Implement sort tests (7)

### Week 3: Robustness
- [ ] Implement pagination tests (10)
- [ ] Implement error handling tests (5)
- [ ] Fix any flaky tests

### Week 4: Complete
- [ ] Implement edge cases (11)
- [ ] Implement performance tests (6)
- [ ] Code review and documentation
- [ ] Celebrate! 🎉

---

## 💡 Pro Tips

1. **Start small**: Don't try to implement all 90+ tests at once. Start with 5, then 10, then 20.

2. **Run tests often**: Execute tests frequently during development to catch issues early.

3. **Use --headed mode**: When developing tests, use `--headed` to see what's happening.

4. **Debug with screenshots**: Add `await page.screenshot({ path: 'debug.png' })` to debug issues.

5. **Keep tests independent**: Each test should be able to run in isolation.

6. **Use test.describe.configure()**: For parallel or serial execution:
   ```typescript
   test.describe.configure({ mode: 'parallel' });
   ```

7. **Clean up test data**: Either in `afterEach` hooks or by using unique prefixes.

8. **Review the trace**: When tests fail, use the trace viewer:
   ```bash
   npx playwright show-trace trace.zip
   ```

---

## 🤝 Need Help?

- Check the detailed test plan: `GROUPS_PAGE_TEST_PLAN.md`
- Review example tests: `groups.spec.ts.example`
- Consult Playwright docs: https://playwright.dev
- Debug with: `npx playwright test --debug`
- Use codegen: `npx playwright codegen http://localhost:5173`

---

**Happy Testing! 🚀**

Remember: E2E tests are an investment. They take time to write but save much more time by catching bugs early and giving you confidence to refactor and improve your code.


