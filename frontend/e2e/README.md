# E2E Testing Documentation

This directory contains all E2E (End-to-End) tests for the Gift Genie application using Playwright.

## 📁 Directory Structure

```
e2e/
├── README.md                           # This file - overview of E2E testing
├── QUICK_START_GUIDE.md               # Get started in 5 steps
├── auth.spec.ts                       # Authentication tests (existing)
├── fixtures.ts                        # Test fixtures and base page objects
├── groups.spec.ts                     # Groups page tests (to be created)
├── groups.spec.ts.example             # Example test implementation
│
├── page-objects/                      # Page Object Model classes
│   ├── GroupsPage.ts                  # Groups list page object
│   └── CreateGroupDialog.ts           # Create group dialog object
│
└── docs/                              # Testing documentation
    ├── GROUPS_PAGE_TEST_PLAN.md       # Comprehensive test plan (90+ tests)
    ├── GROUPS_E2E_SUMMARY.md          # High-level summary & phases
    └── DATA_TESTID_CHECKLIST.md       # Component updates checklist
```

## 🚀 Quick Start

**Want to get started immediately?** 

👉 **Read the [Quick Start Guide](./QUICK_START_GUIDE.md)** - Get your first tests running in 30 minutes!

## 📊 Current Test Coverage

### ✅ Implemented
- **Authentication Flow** (`auth.spec.ts`)
  - Login/logout
  - Session management
  - Protected routes

### 🚧 In Progress
- **Groups Page** - Comprehensive test suite planned
  - See `GROUPS_PAGE_TEST_PLAN.md` for details
  - ~90 test cases covering all functionality

### 📋 Planned
- Members Page
- Exclusions Page
- Draws Page
- Integration flows

## 📚 Documentation Guide

### For Quick Implementation
Start here if you want to implement tests quickly:

1. **[QUICK_START_GUIDE.md](./QUICK_START_GUIDE.md)** - 5-step guide to your first tests
2. **[DATA_TESTID_CHECKLIST.md](./DATA_TESTID_CHECKLIST.md)** - Add test IDs to components
3. **[groups.spec.ts.example](./groups.spec.ts.example)** - Copy and adapt

### For Comprehensive Understanding
Read these for full context and planning:

1. **[GROUPS_E2E_SUMMARY.md](./GROUPS_E2E_SUMMARY.md)** - Overview, phases, metrics
2. **[GROUPS_PAGE_TEST_PLAN.md](./GROUPS_PAGE_TEST_PLAN.md)** - Detailed test specifications
3. **[Page Objects](./page-objects/)** - Reusable page interaction classes

### Decision Matrix

| I want to... | Read this document |
|--------------|-------------------|
| Start coding tests NOW | Quick Start Guide |
| Understand the full scope | Groups E2E Summary |
| See all test cases | Groups Page Test Plan |
| Add test IDs to components | Data TestID Checklist |
| See example test code | groups.spec.ts.example |
| Understand page objects | page-objects/*.ts |

## 🎯 Test Categories

### Groups Page Tests (Planned)

| Category | Tests | Priority | Status |
|----------|-------|----------|--------|
| Authentication | 2 | High | 📋 Planned |
| Page Load | 5 | High | 📋 Planned |
| Create Group | 12 | High | 📋 Planned |
| List Display | 4 | High | 📋 Planned |
| Search | 10 | Medium | 📋 Planned |
| Sort | 7 | Medium | 📋 Planned |
| Pagination | 10 | Medium | 📋 Planned |
| Error Handling | 5 | High | 📋 Planned |
| Edge Cases | 11 | Low | 📋 Planned |
| Performance | 6 | Low | 📋 Planned |
| Integration | 4 | Medium | 📋 Planned |

**Total: ~90 test cases** covering core functionality and edge cases.

## 🛠️ Tools & Setup

### Prerequisites
```bash
# Install Playwright
npm install -D @playwright/test

# Install browsers
npx playwright install chromium
```

### Configuration
- **Config File**: `playwright.config.ts` (in frontend root)
- **Base URL**: `http://localhost:5173`
- **API URL**: `http://localhost:8000`
- **Browser**: Chromium (Desktop Chrome)

### Running Tests
```bash
# Run all E2E tests
npx playwright test

# Run specific test file
npx playwright test e2e/groups.spec.ts

# Run in headed mode (see browser)
npx playwright test --headed

# Run in debug mode
npx playwright test --debug

# Run with UI mode (interactive)
npx playwright test --ui

# View test report
npx playwright show-report
```

### Development Tools
```bash
# Generate test code
npx playwright codegen http://localhost:5173/app/groups

# View trace for failed test
npx playwright show-trace trace.zip

# Update snapshots
npx playwright test --update-snapshots
```

## 🏗️ Page Object Model

This project uses the Page Object Model (POM) pattern for maintainable tests.

### What is POM?
- Encapsulate page interactions in classes
- Separate test logic from page structure
- Reusable methods across tests
- Easy to maintain when UI changes

### Example Usage
```typescript
import { GroupsPage } from './page-objects/GroupsPage';
import { CreateGroupDialog } from './page-objects/CreateGroupDialog';

test('create a group', async ({ authenticatedPage }) => {
  const groupsPage = new GroupsPage(authenticatedPage);
  const dialog = new CreateGroupDialog(authenticatedPage);
  
  await groupsPage.goto();
  await groupsPage.clickCreateGroupButton();
  
  await dialog.createGroup('My Group', {
    historicalExclusionsEnabled: true,
    lookback: 2,
  });
  
  await groupsPage.expectGroupVisible('My Group');
});
```

### Available Page Objects

#### GroupsPage
Main groups list page interactions:
- Navigation
- Search and sort
- Pagination
- Group card interactions
- State assertions (loading, error, empty)

**See:** `page-objects/GroupsPage.ts`

#### CreateGroupDialog
Group creation dialog interactions:
- Form field interactions
- Validation testing
- Submission and cancellation
- Error state checking

**See:** `page-objects/CreateGroupDialog.ts`

## 📋 Implementation Phases

### Phase 1: Foundation (Week 1) ⏳
**Goal:** Basic infrastructure and critical paths

- [ ] Add `data-testid` to components
- [ ] Create initial test file
- [ ] Implement authentication tests (2)
- [ ] Implement page load tests (5)
- [ ] Implement basic create tests (5)

**Deliverable:** ~15 passing tests

### Phase 2: Core Features (Week 2) ⏳
**Goal:** Complete main user workflows

- [ ] Complete create group tests (12)
- [ ] Implement search tests (10)
- [ ] Implement sort tests (7)

**Deliverable:** ~45 passing tests

### Phase 3: Robustness (Week 3) ⏳
**Goal:** Handle edge cases and errors

- [ ] Implement pagination tests (10)
- [ ] Implement error handling tests (5)
- [ ] Fix any flaky tests

**Deliverable:** ~60 passing tests

### Phase 4: Complete (Week 4) ⏳
**Goal:** Full coverage and polish

- [ ] Implement edge cases (11)
- [ ] Implement performance tests (6)
- [ ] Code review and refactor
- [ ] Update documentation

**Deliverable:** 90+ passing tests, complete coverage

## 🎯 Success Metrics

### Coverage Goals
- ✅ 100% of critical user paths tested
- ✅ 90%+ of edge cases covered
- ✅ All error states verified
- ✅ All navigation paths tested

### Quality Goals
- ✅ 0% test flakiness (deterministic results)
- ✅ < 5 minutes total execution time
- ✅ Clear, descriptive test names
- ✅ Maintainable page objects

### CI/CD Integration
- ✅ Tests run on every PR
- ✅ Parallel execution enabled
- ✅ Clear failure reporting
- ✅ Automatic retries (2x on CI)

## 🎓 Best Practices

### Writing Tests
1. **Follow AAA Pattern**: Arrange → Act → Assert
2. **One concept per test**: Test one thing at a time
3. **Descriptive names**: `should create group with historical exclusions`
4. **Use page objects**: Never use raw selectors in tests
5. **Avoid hard waits**: Let Playwright auto-wait

### Page Objects
1. **Encapsulate selectors**: Keep them in page objects
2. **Provide helpers**: Make common operations easy
3. **Return promises**: For method chaining
4. **Single responsibility**: Each method does one thing

### Test Data
1. **Isolate data**: Each test creates its own data
2. **Unique identifiers**: Use timestamps or UUIDs
3. **Clean up**: Remove test data after tests
4. **Prefix test data**: "E2E Test - " for easy identification

### Common Pitfalls to Avoid
- ❌ Hard-coded waits (`page.waitForTimeout()`)
- ❌ Sharing state between tests
- ❌ Testing implementation details
- ❌ Using fragile CSS selectors
- ❌ Ignoring flaky tests

## 🐛 Debugging

### Test Failures
```bash
# Run in debug mode
npx playwright test --debug

# Run specific test
npx playwright test -g "should create group"

# View trace
npx playwright show-trace trace.zip
```

### Common Issues

**Element not found:**
- Check `data-testid` is added
- Verify element is rendered
- Check for timing issues

**Test timeout:**
- Check API is responding
- Verify backend is running
- Look for infinite loading states

**Flaky tests:**
- Remove hard waits
- Use proper assertions
- Check for race conditions

## 📊 Test Reporting

### HTML Report
Generated automatically after test run:
```bash
npx playwright test
npx playwright show-report
```

### CI Integration
Tests run on every PR:
- Results in PR comments
- Screenshots on failure
- Trace files for debugging

## 🤝 Contributing

### Adding New Tests
1. Review the test plan
2. Write test using page objects
3. Run locally to verify
4. Submit PR with tests
5. Ensure CI passes

### Creating New Page Objects
1. Create class in `page-objects/`
2. Extend base Playwright `Page`
3. Define locators in constructor
4. Create interaction methods
5. Add assertion helpers
6. Document usage

### Updating Documentation
- Keep test plan updated
- Update metrics and counts
- Document new patterns
- Share learnings

## 📞 Support

### Need Help?
- **Quick questions:** Check Quick Start Guide
- **Test failures:** Use debug mode and traces
- **New features:** Review test plan and examples
- **Best practices:** Read Playwright docs

### Resources
- [Playwright Documentation](https://playwright.dev/)
- [Test Plan](./GROUPS_PAGE_TEST_PLAN.md)
- [Quick Start](./QUICK_START_GUIDE.md)
- [Example Tests](./groups.spec.ts.example)

## 📝 License

Same as parent project.

---

**Ready to start?** Head to the [Quick Start Guide](./QUICK_START_GUIDE.md)! 🚀


