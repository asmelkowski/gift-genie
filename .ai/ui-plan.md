# UI Architecture for Gift Genie

## 1. UI Structure Overview

Gift Genie’s frontend is a protected, responsive web app organized under a persistent application shell. Authenticated experiences live under `"/app/*"` and are composed of nested routes that mirror domain ownership: groups own members, exclusions, and draws; draws own results. Resource routes treat `403` as `404` to avoid existence disclosure, and all list views sync sort/search/pagination to the URL for deep-linking and shareability.

- **Protected App Shell (`/app/*`)**: Sidebar + header, with a mobile drawer. Contains route outlet for nested views.
- **Routing Model**:
  - Public: `"/login"`, `"/register"`, not-found fallback
  - Protected: `"/app"` (redirect to `"/app/groups"`), `"/app/groups"` (dashboard), `"/app/groups/:groupId/(overview|members|exclusions|draws|settings)"`, `"/app/draws/:drawId/results"`, `"/app/profile"`
  - Errors: `401` → redirect to `"/login"`; `403` and `404` → Not Found page
- **State Management**: React Query for server cache with typed, resource-keyed query keys; Zustand for auth/profile and UI preferences (theme, sidebar state, last-opened tab).
- **Networking**: Typed Axios client generated from OpenAPI types, `withCredentials`, inject `X-CSRF-Token`, intercept `401` (rehydrate or redirect), map `403` to `404` on resource routes.
- **Styling & Components**: TailwindCSS utility-first styling with shadcn/ui (Radix-based) for accessible, consistent UI primitives; theme via CSS variables with dark mode support.
- **UX/A11y**: WCAG 2.1 AA, Radix UI primitives (Dialog, AlertDialog, Tabs, Popover, Tooltip) for a11y and focus management, reduced-motion support, responsive breakpoints, virtualization for large lists, skeleton loaders, accessible dialogs and steppers.
- **Security**: httpOnly cookie session, CSRF token header for mutations, non-disclosure policy (403 → 404), admin-only assignment visibility.
- **Performance**: Prefetch on navigation, tuned `staleTime/cacheTime`, optimistic updates where safe, virtualization for long tables.

## 2. View List

### View: Login
- **View path**: `"/login"`
- **Main purpose**: Authenticate user and establish session.
- **Key information to display**: Email, password inputs; error messages; link to `"/register"`.
- **Key view components**: Auth form, submit button, error alert, loading state.
- **UX, accessibility, and security considerations**:
  - Trap focus within form; label and describe errors inline; disable submit while in-flight; rate-limit feedback.
  - On success, redirect to `"/app/groups"`.
  - API: `POST /api/v1/auth/login`, `GET /api/v1/auth/me`.

### View: Register
- **View path**: `"/register"`
- **Main purpose**: Create a new admin user account.
- **Key information to display**: Name, email, password inputs; guidance on password policy; error messages.
- **Key view components**: Registration form, submit button, success redirect.
- **UX, accessibility, and security considerations**:
  - Clear conflict handling (email in use – `409`); inline validation; passwords masked with visibility toggle.
  - On success, optionally auto-login or redirect to `"/login"` with toast.
  - API: `POST /api/v1/auth/register`.

### View: Not Found
- **View path**: Fallback route and explicit `"/404"` if desired
- **Main purpose**: Present a generic not-found page for missing/forbidden resources (403 mapped to 404).
- **Key information to display**: Friendly message, link to `"/app/groups"`.
- **Key view components**: Illustration/message, primary action button.
- **UX, accessibility, and security considerations**:
  - Avoid existence leaks by showing the same UI for `403` and `404` on resource routes.

### View: App Shell
- **View path**: `"/app/*"`
- **Main purpose**: Provide persistent layout (sidebar/header) and protected route outlet.
- **Key information to display**: User menu, navigation items, current route title/breadcrumb, theme toggle.
- **Key view components**: Sidebar (desktop) + drawer (mobile), header, route outlet, global toasts, confirm dialogs.
- **UX, accessibility, and security considerations**:
  - Keyboard navigation, focus outlines, large touch targets; reduced-motion for transitions.
  - Guard all children with auth; fetch `"/api/v1/auth/me"` to bootstrap.

### View: Dashboard (Groups List)
- **View path**: `"/app/groups"`
- **Main purpose**: Show user’s groups and entry points into group detail.
- **Key information to display**: Group name, created date, member counts, historical exclusion settings.
- **Key view components**: Data table/cards (responsive), search input, sort menu, pagination, “Create group” button.
- **UX, accessibility, and security considerations**:
  - URL-synced search/sort/page; virtualization for many groups; empty-state guidance.
  - Post-create redirect to Members tab (per decisions).
  - API: `GET /api/v1/groups`, `POST /api/v1/groups`.

### View: Group Overview
- **View path**: `"/app/groups/:groupId/overview"`
- **Main purpose**: Snapshot of group stats and quick actions.
- **Key information to display**: Member counts (total/active), latest draws and statuses, exclusion summary, settings highlights.
- **Key view components**: Stat cards, recent draws list, quick links (Members/Exclusions/Draws/Settings).
- **UX, accessibility, and security considerations**:
  - Prefetch next-tab data on hover/focus; handle `404/403→Not Found`.
  - API: `GET /api/v1/groups/{groupId}`, `GET /api/v1/groups/{groupId}/draws?limit` (optional prefetch).

### View: Group Members
- **View path**: `"/app/groups/:groupId/members"`
- **Main purpose**: Manage members (CRUD, active toggle).
- **Key information to display**: Member name, email (optional), active status, created date.
- **Key view components**: Data table/cards, add/edit drawer or modal, active/inactive filter, search, pagination.
- **UX, accessibility, and security considerations**:
  - Validate unique name/email in-group; display conflicts (`409`); prevent deactivation conflicts.
  - Keep user on page after add; show toast (decision: stay with toast).
  - API: `GET/POST /api/v1/groups/{groupId}/members`, `GET/PATCH/DELETE /api/v1/groups/{groupId}/members/{memberId}`.

### View: Group Exclusions
- **View path**: `"/app/groups/:groupId/exclusions"`
- **Main purpose**: Configure manual exclusions; visualize historical ones.
- **Key information to display**: Matrix of members (giver × receiver), manual vs historical markers, staged changes.
- **Key view components**: Accessible matrix grid (desktop) with mutual toggle; mobile stepper flow; staged bulk changes panel; submit/cancel.
- **UX, accessibility, and security considerations**:
  - Prevent self-exclusion; inline conflict surfacing; keyboard-accessible grid; screenreader labels for cell coordinates.
  - Submit staged changes in bulk; show validation/conflict details on `409`.
  - API: `GET /api/v1/groups/{groupId}/exclusions`, `POST /api/v1/groups/{groupId}/exclusions`, `POST /api/v1/groups/{groupId}/exclusions/bulk`, `DELETE /api/v1/groups/{groupId}/exclusions/{exclusionId}`.

### View: Group Draws
- **View path**: `"/app/groups/:groupId/draws"`
- **Main purpose**: Create and manage draws; run lifecycle.
- **Key information to display**: Draw list (status, created/finalized timestamps, notification state), lifecycle actions.
- **Key view components**: Draw list/table, “Create draw” button, lifecycle stepper (Create → Execute → Finalize → Notify), blocking overlay during execute, guidance on `422`.
- **UX, accessibility, and security considerations**:
  - Disable actions based on state; confirm finalize (immutability); show confetti on finalize (respect reduced motion).
  - Post-actions: Create → remain in Draws; Finalize → Results; Notify shows `{ sent, skipped }` summary.
  - API: `GET/POST /api/v1/groups/{groupId}/draws`, `GET/DELETE /api/v1/draws/{drawId}`, `POST /api/v1/draws/{drawId}/execute`, `POST /api/v1/draws/{drawId}/finalize`, `POST /api/v1/draws/{drawId}/notify`.

### View: Draw Results
- **View path**: `"/app/draws/:drawId/results"`
- **Main purpose**: Display finalized draw assignments (admin-only).
- **Key information to display**: Assignment pairs (giver → receiver) with names; export options.
- **Key view components**: Results table, copy-to-clipboard, CSV export, filters/search.
- **UX, accessibility, and security considerations**:
  - Only accessible for finalized draws; handle `404/403→Not Found`.
  - Respect large lists with virtualization; include timezone-aware timestamps.
  - API: `GET /api/v1/draws/{drawId}`, `GET /api/v1/draws/{drawId}/assignments?include=names`.

### View: Group Settings
- **View path**: `"/app/groups/:groupId/settings"`
- **Main purpose**: Configure historical exclusions and group properties.
- **Key information to display**: Group name, historical settings (enabled, lookback), destructive actions (delete pending draws, delete group).
- **Key view components**: Form with toggles/inputs, save button, dangerous-action confirm dialogs.
- **UX, accessibility, and security considerations**:
  - Explain historical exclusions; validate lookback ≥ 0; confirm destructive actions; show permissions errors as `404`.
  - API: `GET/PATCH /api/v1/groups/{groupId}`, `DELETE /api/v1/draws/{drawId}` (pending only), `DELETE /api/v1/groups/{groupId}`.

### View: Profile
- **View path**: `"/app/profile"`
- **Main purpose**: View/edit profile; change password; logout action.
- **Key information to display**: Name, email; password change form.
- **Key view components**: Profile form, password change form, logout button.
- **UX, accessibility, and security considerations**:
  - Inline validation; confirm email conflict (`409`); secure password change with masked inputs; session handling on email change if required.
  - API: `GET/PATCH /api/v1/auth/me`, `POST /api/v1/auth/change-password`, `POST /api/v1/auth/logout`.

## 3. User Journey Map

Primary flow (admin organizer):
1. Register or login (`"/register"` → `"/login"`).
2. Land on `"/app/groups"`; create group → redirected to Members tab `"/app/groups/:groupId/members"`.
3. Add members (stay on page with success toast). Toggle active status as needed.
4. Configure exclusions in `"/app/groups/:groupId/exclusions"` using matrix/stepper; stage bulk changes; submit.
5. Go to Draws (`"/app/groups/:groupId/draws"`); create a draw; execute (blocking overlay). If `422`, show guidance and link back to Members/Exclusions.
6. Finalize draw (confirm immutability). On success, auto-navigate to `"/app/draws/:drawId/results"` with confetti (reduced-motion aware).
7. Notify members (from Draws or Results); show `{ sent, skipped }` summary; resend if needed.
8. View results anytime from history (admin-only). Configure historical rules in Settings for future draws.

Alternative flows:
- Add late member → create new draw → notify; history remains visible.
- Delete pending draw from Draws list (finalized draws immutable).

## 4. Layout and Navigation Structure

- **Global layout**: App Shell with left sidebar (desktop) and header; mobile shows hamburger to open drawer. Content outlet renders nested routes.
- **Primary navigation items**: `Groups`, `Profile` (and optional `Help/About`).
- **Secondary (contextual) navigation**: Within `GroupDetail`, tabs: `Overview`, `Members`, `Exclusions`, `Draws`, `Settings`.
- **Route guards**:
  - On first mount, call `"/api/v1/auth/me"`; `401` → `"/login"`.
  - Resource routes render Not Found on `403` and `404`.
- **URL state**:
  - Lists sync `search`, `page`, `page_size`, `sort` via query params.
  - Preserve last-opened group tab in Zustand for quick return.
- **Prefetching**: Hover/focus on navigation prefetches related queries (e.g., `['group', groupId]`, `['members', groupId]`).
- **Feedback**: Global toasts for success/errors; skeletons while loading; inline field errors on `409/422`.

## 5. Key Components

- **AppShell**: Protected layout with sidebar/header and route outlet; mobile drawer.
- **ProtectedRoute**: Wrapper enforcing auth and handling redirects.
- **Sidebar/NavMenu**: Primary navigation with active route highlighting and keyboard navigation.
- **HeaderBar**: Breadcrumb/title, search slot, theme toggle, user menu.
- **DataTable / CardList**: Responsive list renderer with sorting, pagination, virtualization, and skeletons.
- **SearchBar & FilterBar**: Inputs wired to URL query params.
- **PaginationControls**: Page navigation, page size selector.
- **GroupTabs**: Tabbed navigation for group detail routes.
- **MemberForm**: Add/edit member with validation and conflict messages.
- **ExclusionMatrix**: Accessible grid with mutual toggle; staged changes panel; submit/cancel.
- **ExclusionStepper (mobile)**: Step-by-step exclusion editor for small screens.
- **DrawLifecycleStepper**: Create → Execute → Finalize → Notify actions with state-based enablement and guidance.
- **BlockingOverlay**: Full-screen progress overlay during draw execution.
- **ResultsTable**: Assignment pairs with copy/CSV export.
- **ConfirmDialog**: Accessible confirmations for destructive/immutable actions.
- **Toast/Alert**: Global feedback for success/errors.
- **ErrorBoundary + NotFound**: Catch-all errors and not-found rendering (403/404 unified).
- **Theme/Tokens**: TailwindCSS design tokens (via CSS variables) for colors/spacing/typography with dark mode and reduced-motion support.
- **RadixPrimitives**: Base building blocks (Dialog, AlertDialog, Tabs, Popover, Tooltip) to ensure consistent accessibility semantics.

This architecture maps PRD user stories to concrete views and components, aligns with the API plan (endpoints identified per view), enforces security and non-disclosure policies, and incorporates session decisions for navigation and feedback patterns.
