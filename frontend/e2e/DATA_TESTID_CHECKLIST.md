# Data TestID Attributes Checklist

This document tracks the `data-testid` attributes that need to be added to components for E2E testing.

## Why `data-testid`?

Using `data-testid` attributes provides:
- **Stability**: Tests won't break when CSS classes or text content changes
- **Clarity**: Makes it obvious which elements are used in tests
- **Maintainability**: Easy to find elements used in E2E tests

## Format

```tsx
<element data-testid="descriptive-name">
```

---

## Components to Update

### ✅ = Added | ⏳ = Pending | ⚠️ = Partially Done

---

## 1. GroupsPage.tsx (Main Page)

**File:** `frontend/src/components/GroupsPage.tsx`

- [ ] **Root Container**
  ```tsx
  <div data-testid="groups-page">
  ```

- [ ] **Page Header** (delegated to PageHeader component - see below)

---

## 2. PageHeader.tsx

**File:** `frontend/src/components/GroupsPage/PageHeader.tsx`

- [ ] **Header Container**
  ```tsx
  <div data-testid="groups-page-header">
  ```

- [ ] **Create Group Button**
  ```tsx
  <Button data-testid="create-group-button" onClick={onCreateClick}>
    Create Group
  </Button>
  ```

---

## 3. GroupsToolbar.tsx

**File:** `frontend/src/components/GroupsPage/GroupsToolbar.tsx`

- [ ] **Toolbar Container**
  ```tsx
  <div data-testid="groups-toolbar">
  ```

- [ ] **Search Input**
  ```tsx
  <Input 
    data-testid="search-groups-input"
    placeholder="Search groups..."
    // ... other props
  />
  ```

- [ ] **Sort Select**
  ```tsx
  <select data-testid="sort-groups-select" value={sort} onChange={...}>
    <option value="-created_at">Newest first</option>
    <option value="created_at">Oldest first</option>
    <option value="name">Name (A-Z)</option>
    <option value="-name">Name (Z-A)</option>
  </select>
  ```

---

## 4. GroupsGrid.tsx

**File:** `frontend/src/components/GroupsPage/GroupsGrid.tsx`

- [ ] **Grid Container**
  ```tsx
  <div data-testid="groups-grid" className="grid ...">
  ```

---

## 5. GroupCard.tsx

**File:** `frontend/src/components/GroupsPage/GroupCard.tsx`

- [ ] **Card Container**
  ```tsx
  <div 
    data-testid={`group-card-${group.id}`}
    className="card-classes..."
  >
  ```

- [ ] **Group Name**
  ```tsx
  <h3 data-testid="group-card-name">
    {group.name}
  </h3>
  ```

- [ ] **Group Created Date** (if displayed)
  ```tsx
  <span data-testid="group-card-created-date">
    {formatDate(group.created_at)}
  </span>
  ```

- [ ] **Member Count** (if displayed)
  ```tsx
  <span data-testid="group-card-member-count">
    {group.member_count} members
  </span>
  ```

**Alternative Pattern (if preferred):**
```tsx
<div 
  data-testid="group-card"
  data-group-id={group.id}
  className="card-classes..."
>
  <h3>{group.name}</h3>
</div>
```

---

## 6. CreateGroupDialog.tsx

**File:** `frontend/src/components/GroupsPage/CreateGroupDialog.tsx`

- [ ] **Dialog Container** (may be in Dialog component)
  ```tsx
  <Dialog data-testid="create-group-dialog" isOpen={isOpen} onClose={onClose}>
  ```

- [ ] **Group Name Input**
  ```tsx
  <Input
    id="group-name"
    data-testid="group-name-input"
    type="text"
    value={formData.name}
    onChange={handleNameChange}
    // ... other props
  />
  ```

- [ ] **Historical Exclusions Checkbox**
  ```tsx
  <input
    id="exclusions-enabled"
    data-testid="historical-exclusions-checkbox"
    type="checkbox"
    checked={formData.historical_exclusions_enabled}
    onChange={handleExclusionsChange}
    // ... other props
  />
  ```

- [ ] **Lookback Input**
  ```tsx
  <Input
    id="lookback"
    data-testid="lookback-input"
    type="number"
    min="1"
    value={formData.historical_exclusions_lookback}
    onChange={handleLookbackChange}
    // ... other props
  />
  ```

- [ ] **Submit Button**
  ```tsx
  <Button 
    type="submit" 
    data-testid="submit-create-group"
    disabled={mutation.isPending}
  >
    {mutation.isPending ? 'Creating...' : 'Create'}
  </Button>
  ```

- [ ] **Cancel Button**
  ```tsx
  <Button
    type="button"
    variant="outline"
    data-testid="cancel-create-group"
    onClick={handleClose}
    disabled={mutation.isPending}
  >
    Cancel
  </Button>
  ```

---

## 7. LoadingState.tsx

**File:** `frontend/src/components/GroupsPage/LoadingState.tsx`

- [ ] **Loading Container**
  ```tsx
  <div data-testid="loading-state">
    {/* Loading skeleton or spinner */}
  </div>
  ```

---

## 8. ErrorState.tsx

**File:** `frontend/src/components/GroupsPage/ErrorState.tsx`

- [ ] **Error Container**
  ```tsx
  <div data-testid="error-state">
  ```

- [ ] **Retry Button**
  ```tsx
  <Button data-testid="retry-button" onClick={onRetry}>
    Try Again
  </Button>
  ```

---

## 9. EmptyState.tsx

**File:** `frontend/src/components/GroupsPage/EmptyState.tsx`

- [ ] **Empty State Container**
  ```tsx
  <div data-testid="empty-state">
  ```

- [ ] **Create First Group Button**
  ```tsx
  <Button data-testid="create-first-group-button" onClick={onCreateClick}>
    Create your first group
  </Button>
  ```

---

## 10. PaginationControls.tsx

**File:** `frontend/src/components/GroupsPage/PaginationControls.tsx`

- [ ] **Pagination Container**
  ```tsx
  <div data-testid="pagination-controls">
  ```

- [ ] **Previous Button**
  ```tsx
  <Button 
    data-testid="pagination-previous"
    onClick={handlePrevious}
    disabled={meta.page === 1}
  >
    Previous
  </Button>
  ```

- [ ] **Next Button**
  ```tsx
  <Button 
    data-testid="pagination-next"
    onClick={handleNext}
    disabled={meta.page === meta.total_pages}
  >
    Next
  </Button>
  ```

- [ ] **Page Number Buttons** (if using numbered pagination)
  ```tsx
  {pageNumbers.map(page => (
    <Button 
      key={page}
      data-testid={`pagination-page-${page}`}
      onClick={() => onPageChange(page)}
    >
      {page}
    </Button>
  ))}
  ```

---

## 11. UI Components (if needed)

### Dialog Component

**File:** `frontend/src/components/ui/dialog.tsx`

If the Dialog component doesn't support `data-testid` pass-through:

- [ ] **Add `data-testid` prop to Dialog**
  ```tsx
  interface DialogProps {
    // ... existing props
    'data-testid'?: string;
  }

  export function Dialog({ 
    'data-testid': dataTestId,
    // ... other props 
  }: DialogProps) {
    return (
      <div data-testid={dataTestId} {...otherProps}>
        {/* dialog content */}
      </div>
    );
  }
  ```

### Input Component

**File:** `frontend/src/components/ui/input.tsx`

- [ ] **Ensure Input forwards `data-testid`**
  ```tsx
  export const Input = React.forwardRef<HTMLInputElement, InputProps>(
    ({ 'data-testid': dataTestId, ...props }, ref) => {
      return (
        <input
          data-testid={dataTestId}
          ref={ref}
          {...props}
        />
      );
    }
  );
  ```

### Button Component

**File:** `frontend/src/components/ui/button.tsx`

- [ ] **Ensure Button forwards `data-testid`**
  ```tsx
  export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
    ({ 'data-testid': dataTestId, ...props }, ref) => {
      return (
        <button
          data-testid={dataTestId}
          ref={ref}
          {...props}
        />
      );
    }
  );
  ```

---

## Implementation Order

### Phase 1: Critical Path (Do First)
1. ✅ PageHeader.tsx - page header and create button
2. ✅ CreateGroupDialog.tsx - all form fields and buttons
3. ✅ GroupCard.tsx - card and name
4. ✅ GroupsGrid.tsx - grid container
5. ✅ LoadingState.tsx - loading indicator
6. ✅ ErrorState.tsx - error display
7. ✅ EmptyState.tsx - empty state

### Phase 2: Search & Sort
8. ✅ GroupsToolbar.tsx - search input and sort select

### Phase 3: Pagination
9. ✅ PaginationControls.tsx - all pagination controls

### Phase 4: UI Components (if needed)
10. ⚠️ Dialog, Input, Button - ensure prop forwarding

---

## Testing the Implementation

After adding `data-testid` attributes, verify them:

### Manual Verification
1. Open the page in browser
2. Open DevTools (F12)
3. Inspect elements
4. Verify `data-testid` attributes are present

### With Playwright
```bash
# Run in debug mode to see elements
npx playwright test --debug

# Or use the codegen tool
npx playwright codegen http://localhost:5173/app/groups
```

### In Test Code
```typescript
// This should work if data-testid is added correctly
await page.getByTestId('create-group-button').click();
```

---

## Common Patterns

### Conditional Rendering
```tsx
{isLoading && (
  <div data-testid="loading-state">Loading...</div>
)}

{error && (
  <div data-testid="error-state">{error.message}</div>
)}
```

### Dynamic IDs
```tsx
// Use template literals for dynamic IDs
<div data-testid={`group-card-${group.id}`}>

// Or for list items
{items.map((item, index) => (
  <div key={item.id} data-testid={`item-${item.id}`}>
))}
```

### Multiple Elements
```tsx
// When you need to target multiple elements
<div data-testid="group-card">
  <h3 data-testid="group-card-name">{name}</h3>
  <p data-testid="group-card-description">{description}</p>
</div>

// Access in tests:
const card = page.getByTestId('group-card');
const name = card.getByTestId('group-card-name');
```

---

## Best Practices

### ✅ DO:
- Use descriptive, kebab-case names: `create-group-button`
- Add `data-testid` to interactive elements
- Use dynamic IDs for list items: `group-card-${id}`
- Keep names consistent with component hierarchy

### ❌ DON'T:
- Use CSS classes or IDs for test selectors (they change)
- Use text content for selectors (it changes, especially with i18n)
- Add `data-testid` to every single element (only what tests need)
- Use generic names: `button1`, `div2`

---

## Verification Checklist

After implementation, verify:

- [ ] All `data-testid` attributes added as per this document
- [ ] Manual inspection in browser DevTools confirms presence
- [ ] Page object methods can locate elements
- [ ] Sample tests pass successfully
- [ ] No TypeScript errors in components
- [ ] No linter warnings

---

## Notes

- **TypeScript**: You may need to extend component prop types to accept `data-testid`
- **Styled Components**: `data-testid` works the same way as regular HTML attributes
- **ShadyUI Components**: Check if they forward props correctly
- **Existing Tests**: Update `frontend/e2e/auth.spec.ts` to use new `data-testid` selectors

---

## Reference

- [Playwright Best Practices](https://playwright.dev/docs/best-practices)
- [Testing Library - ByTestId](https://testing-library.com/docs/queries/bytestid/)
- [Accessibility Note](https://kentcdodds.com/blog/making-your-ui-tests-resilient-to-change)

---

**Status**: Ready for implementation
**Last Updated**: [Current Date]
**Owner**: [Your Name]


