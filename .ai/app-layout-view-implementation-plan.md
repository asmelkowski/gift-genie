# View Implementation Plan: App Layout

## 1. Overview

The App Layout view is a persistent container for all authenticated application routes. It provides a consistent user experience across the application with a responsive navigation structure (sidebar on desktop, mobile drawer on mobile), a header with user profile menu and theme toggle, breadcrumb navigation, and global UI elements (toasts and confirm dialogs). The layout guards all child routes by ensuring the user is authenticated via the ProtectedRoute component and bootstrap user data via the `GET /api/v1/auth/me` endpoint.

## 2. View Routing

- **Path**: `/app/*` - Parent route for all authenticated app pages
- **Access**: Only authenticated users (guarded by ProtectedRoute)
- **Child Routes**: Will include `/app/groups`, `/app/groups/:id`, `/app/settings`, etc.
- **Bootstrap**: On app initialization, `GET /api/v1/auth/me` is fetched to verify authentication status

## 3. Component Structure

```
AppLayout
├── Header
│   ├── Logo/Brand
│   ├── Breadcrumb
│   ├── Theme Toggle Button
│   └── UserMenu
│       ├── User Avatar
│       ├── Dropdown Menu
│       │   ├── Profile Link
│       │   ├── Settings Link
│       │   └── Logout Button
│       └── Logout
├── Main Content Area
│   ├── Sidebar (Desktop - visible on screens ≥ 1024px)
│   │   ├── Navigation Items
│   │   │   ├── Groups
│   │   │   ├── Settings
│   │   │   └── Help
│   │   └── Collapse Toggle
│   ├── MobileDrawer (Mobile - visible on screens < 1024px)
│   │   ├── Hamburger Trigger (in Header)
│   │   ├── Navigation Items
│   │   └── Backdrop/Overlay
│   └── RouteOutlet (Nested Routes Content)
└── Global UI Elements
    ├── Toast Container (managed by react-hot-toast)
    └── Confirm Dialog Container
```

## 4. Component Details

### AppLayout

**Component Description**
The root layout component that wraps all authenticated routes. It manages overall layout state (sidebar visibility, theme), fetches and displays user information from Zustand store, and provides the route outlet for nested routes. Handles responsive behavior (desktop sidebar vs mobile drawer) and ensures authentication guard.

**Main Elements**
- Flexbox container with header at top and main content below
- Header component spanning full width
- Two-column layout: Sidebar (left, desktop only) + Main content (right)
- RouteOutlet for nested routes
- Media queries for responsive behavior (Tailwind `lg:` breakpoint)

**Handled Interactions**
- Toggle sidebar visibility on mobile
- Close sidebar on route change
- Theme toggle propagation
- Logout handler propagation

**Handled Validation**
- Auth check: User must exist in Zustand store (`useAuthStore().user !== null`)
- If not authenticated, ProtectedRoute redirects to `/login`
- Redirect to `/login` if fetching user profile returns 401

**Types**
- No props required (layout is self-contained)
- Uses `UserViewModel` from Zustand store
- Uses React Router's `useLocation()` for route tracking

**Props**
None - AppLayout is a self-contained wrapper component

### Header

**Component Description**
Top navigation bar spanning the full width of the layout. Displays the application brand/logo, breadcrumb navigation showing the current page context, theme toggle button, and user menu. On mobile, includes hamburger menu trigger for sidebar drawer.

**Main Elements**
- Horizontal flexbox container with items spread (space-between)
- Left: Logo/brand text or icon
- Center: Breadcrumb navigation
- Right: Theme toggle button, hamburger menu (mobile only), user menu
- Semantic `<header>` element

**Handled Interactions**
- Click theme toggle button → call `toggleTheme()` hook
- Click hamburger menu (mobile) → call `toggleSidebar()` hook
- Click user avatar → call `toggleUserMenu()` hook
- Click breadcrumb items → navigate to parent routes
- Click logout → call logout handler

**Handled Validation**
- User email/name display from Zustand store
- Only show logout button if user exists in store
- Theme preference loaded from localStorage or defaults to 'light'
- Current breadcrumb path matches React Router location

**Types**
- Uses `UserViewModel` from Zustand store
- Uses React Router's `useLocation()` hook
- Props interface:
  ```typescript
  interface HeaderProps {
    onToggleSidebar: () => void;
    onLogout: () => void;
    currentPath: string;
    breadcrumbs: BreadcrumbItem[];
  }
  ```

**Props**
- `onToggleSidebar`: Callback to toggle mobile sidebar
- `onLogout`: Callback to handle logout
- `currentPath`: Current route path for breadcrumb highlighting
- `breadcrumbs`: Array of breadcrumb items to display

### Sidebar

**Component Description**
Left-side navigation panel (desktop only, hidden on mobile via Tailwind). Displays main navigation items (Groups, Settings, Help) with icons and labels. Includes visual indication of the current active route. Can be collapsed on desktop to save space (optional enhancement).

**Main Elements**
- Vertical flexbox container fixed width (e.g., 250px)
- Navigation list with links
- Active route highlighting
- Optional collapse button
- Semantic `<nav>` element
- Vertical scroll if content exceeds viewport

**Handled Interactions**
- Click navigation item → navigate to route via React Router Link
- Hover effect on navigation items
- Active route styling

**Handled Validation**
- Highlight current route based on `useLocation().pathname`
- Validate all navigation items are accessible (auth check already done at layout level)

**Types**
- Navigation items structure:
  ```typescript
  interface NavigationItem {
    label: string;
    path: string;
    icon?: string;
    badge?: number;
  }
  ```

**Props**
- `isOpen`: Boolean for desktop collapse state (optional)
- `onNavigate`: Optional callback when route changes
- `activeRoute`: Current route pathname

### MobileDrawer

**Component Description**
Mobile-only overlay drawer containing the same navigation as Sidebar but styled as a full-height drawer that slides in from the left. Only visible on screens smaller than 1024px (Tailwind `lg:` breakpoint). Triggered by hamburger button in header.

**Main Elements**
- Fixed position overlay (z-index managed)
- Slide-in animation from left
- Semi-transparent backdrop with click-to-close
- Navigation list (same as Sidebar)
- Close button or backdrop click to dismiss
- Semantic `<nav>` element

**Handled Interactions**
- Click hamburger to open drawer
- Click navigation item → navigate to route, auto-close drawer
- Click backdrop → close drawer
- ESC key → close drawer
- Prevent body scroll when drawer open (optional)

**Handled Validation**
- Only visible on mobile (controlled by Tailwind and component visibility)
- Auto-close on route change

**Types**
- Same `NavigationItem` interface as Sidebar
- Props interface:
  ```typescript
  interface MobileDrawerProps {
    isOpen: boolean;
    onClose: () => void;
    onNavigate?: () => void;
    activeRoute: string;
  }
  ```

**Props**
- `isOpen`: Boolean controlling drawer visibility
- `onClose`: Callback to close drawer
- `onNavigate`: Optional callback on navigation (to auto-close)
- `activeRoute`: Current route pathname

### UserMenu

**Component Description**
Dropdown menu in the top-right of the header showing the current user's email and name, with options to view profile, access settings, and logout. Positioned as an absolute overlay relative to the header.

**Main Elements**
- Avatar button (circular with initials or icon)
- Dropdown container positioned absolutely
- Menu items (Profile, Settings, Logout)
- Semantic `<button>` and `<ul>`/`<li>` structure
- Focus trap when open

**Handled Interactions**
- Click avatar → toggle menu open/close
- Click menu item → navigate (Profile, Settings) or trigger action (Logout)
- Click outside → close menu (backdrop click)
- ESC key → close menu
- Tab trap within menu when open

**Handled Validation**
- Display user email and name from Zustand store
- Only show if `useAuthStore().user !== null`
- Only show logout button if authenticated

**Types**
- Uses `UserViewModel` from Zustand store
- Props interface:
  ```typescript
  interface UserMenuProps {
    user: UserViewModel | null;
    onLogout: () => void;
  }
  ```

**Props**
- `user`: Current user from Zustand store
- `onLogout`: Callback to handle logout

### Breadcrumb

**Component Description**
Navigation path display below the header showing the current page context (e.g., "Groups > Group Name > Members"). Clickable items navigate to parent routes. Generated dynamically from React Router location.

**Main Elements**
- Horizontal list of breadcrumb items separated by `/` or `>`
- Links for navigation
- Last item (current page) not clickable, styled differently
- Semantic `<nav>` with `<ol>` and `<li>`

**Handled Interactions**
- Click breadcrumb item → navigate to that route
- Hover effect on clickable items

**Handled Validation**
- Generate from `useLocation().pathname`
- Only show items for recognized routes
- Last item not clickable (current page)

**Types**
- Breadcrumb item:
  ```typescript
  interface BreadcrumbItem {
    label: string;
    path: string;
  }
  ```

**Props**
- `items`: Array of breadcrumb items

## 5. Types

### UserViewModel
Auto-generated from backend and stored in Zustand. Represents the authenticated user.

```typescript
interface UserViewModel {
  id: string;          // UUID of the user
  email: string;       // User email address
  name: string;        // User display name
}
```

### NavigationItem
Represents a single navigation item in sidebar/drawer.

```typescript
interface NavigationItem {
  label: string;       // Display label (e.g., "Groups", "Settings")
  path: string;        // Route path (e.g., "/app/groups")
  icon?: string;       // Optional icon name (CSS class or component)
  badge?: number;      // Optional badge count (e.g., unread items)
}
```

### BreadcrumbItem
Represents a single breadcrumb in the navigation path.

```typescript
interface BreadcrumbItem {
  label: string;       // Display text
  path: string;        // Route path to navigate to
}
```

### AppLayoutContextState (Optional)
If using React Context for theme and layout state instead of Zustand. Provides global state for theme, sidebar visibility, and navigation.

```typescript
interface AppLayoutContextState {
  theme: 'light' | 'dark';           // Current theme
  sidebarOpen: boolean;              // Mobile sidebar visibility
  toggleTheme: () => void;           // Toggle between light/dark
  toggleSidebar: () => void;         // Toggle sidebar on mobile
  closeSidebar: () => void;          // Close sidebar
  setBreadcrumbs: (items: BreadcrumbItem[]) => void;
  breadcrumbs: BreadcrumbItem[];
}
```

## 6. State Management

**Zustand Store Usage (useAuthStore)**
- Already initialized in `hooks/useAuthStore.ts`
- Stores authenticated `user: UserViewModel | null`
- Stores `csrfToken: string | null`
- Provides `isAuthenticated()` method
- Used in ProtectedRoute for auth check
- Retrieved in AppLayout to display user info in Header

**Local Component State (useState)**
- `sidebarOpen: boolean` (AppLayout) - Controls mobile drawer visibility
- `userMenuOpen: boolean` (UserMenu) - Controls dropdown menu visibility
- `theme: 'light' | 'dark'` (AppLayout or ThemeProvider) - Current theme preference

**Context State (Optional - React.createContext)**
If centralizing theme and layout state, create `AppLayoutContext`:

```typescript
// contexts/AppLayoutContext.tsx
interface AppLayoutContextState {
  theme: 'light' | 'dark';
  sidebarOpen: boolean;
  toggleTheme: () => void;
  toggleSidebar: () => void;
  closeSidebar: () => void;
}

const AppLayoutContext = createContext<AppLayoutContextState>(/* ... */);

export function AppLayoutProvider({ children }) {
  const [theme, setTheme] = useState(() => 
    localStorage.getItem('app-theme') ?? 'light'
  );
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const toggleTheme = useCallback(() => {
    setTheme(prev => prev === 'light' ? 'dark' : 'light');
    localStorage.setItem('app-theme', theme === 'light' ? 'dark' : 'light');
  }, [theme]);

  const toggleSidebar = useCallback(() => setSidebarOpen(prev => !prev), []);
  const closeSidebar = useCallback(() => setSidebarOpen(false), []);

  return (
    <AppLayoutContext.Provider value={{ theme, sidebarOpen, toggleTheme, toggleSidebar, closeSidebar }}>
      {children}
    </AppLayoutContext.Provider>
  );
}

export function useAppLayout() {
  return useContext(AppLayoutContext);
}
```

**Custom Hooks**

`useAppLayout()` - Manage layout state (theme, sidebar)
```typescript
function useAppLayout() {
  const [theme, setTheme] = useState('light');
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const toggleTheme = useCallback(() => {
    setTheme(prev => prev === 'light' ? 'dark' : 'light');
    localStorage.setItem('theme', theme === 'light' ? 'dark' : 'light');
  }, [theme]);

  const toggleSidebar = useCallback(() => setSidebarOpen(prev => !prev), []);
  const closeSidebar = useCallback(() => setSidebarOpen(false), []);

  return { theme, sidebarOpen, toggleTheme, toggleSidebar, closeSidebar };
}
```

`useBreadcrumbs()` - Generate breadcrumbs from current route
```typescript
function useBreadcrumbs(): BreadcrumbItem[] {
  const location = useLocation();
  
  const breadcrumbMap: Record<string, string> = {
    '/app/groups': 'Groups',
    '/app/settings': 'Settings',
    '/app/help': 'Help',
  };

  const parts = location.pathname.split('/').filter(Boolean);
  const breadcrumbs = parts.map((part, index) => {
    const path = '/' + parts.slice(0, index + 1).join('/');
    return {
      label: breadcrumbMap[path] || part.charAt(0).toUpperCase() + part.slice(1),
      path,
    };
  });

  return breadcrumbs;
}
```

## 7. API Integration

### Bootstrap Authentication (Fetch Current User)

**Endpoint**: `GET /api/v1/auth/me`

**Request**
- No request body
- Authentication via httpOnly cookie (automatic)
- No headers needed (CSRF token already set after login)

**Response (200 OK)**
```typescript
{
  id: string;              // User UUID
  email: string;           // User email
  name: string;            // User display name
  created_at: string;      // ISO 8601 datetime
  updated_at: string;      // ISO 8601 datetime
}
```

**Response (401 Unauthorized)**
```typescript
{
  code: "unauthorized"
}
```

**Frontend Integration** (Already in App.tsx)
```typescript
const { data } = useQuery({
  queryKey: ['auth', 'me'],
  queryFn: async () => {
    const response = await api.get('/api/v1/auth/me');
    return response.data;
  },
  enabled: !hasCheckedSession.current,
  staleTime: Infinity,
  retry: false,
});

useEffect(() => {
  if (data) {
    login(data.user, csrfToken);
  }
}, [data, login]);
```

**Usage in AppLayout**
- User data is already available in `useAuthStore().user` from bootstrap
- No need to re-fetch in AppLayout
- If user is null, ProtectedRoute redirects to login before AppLayout renders

### Logout Endpoint (If implemented)

**Endpoint**: `POST /api/v1/auth/logout` (To be implemented in backend)

**Request**
- No body
- Authentication via httpOnly cookie

**Response (204 No Content)**
- Server clears session/token

**Frontend Integration**
```typescript
const logoutMutation = useMutation({
  mutationFn: async () => {
    await api.post('/api/v1/auth/logout');
  },
  onSuccess: () => {
    useAuthStore.getState().logout();
    queryClient.clear();
    navigate('/login');
  },
  onError: () => {
    toast.error('Logout failed. Clearing session locally.');
    useAuthStore.getState().logout();
    navigate('/login');
  },
});
```

## 8. User Interactions

| Interaction | Component | Trigger | Expected Outcome | API Call |
|---|---|---|---|---|
| App loads | App.tsx | Component mount | Fetch `/api/v1/auth/me`, set user in store, render AppLayout | GET /auth/me |
| User clicks hamburger menu | Header | Click on mobile | MobileDrawer opens with overlay | None |
| User clicks nav item in sidebar/drawer | Sidebar/Drawer | Click link | Navigate to route, close drawer (mobile), update breadcrumb | None |
| User clicks theme toggle | Header | Click button | Switch theme 'light' ↔ 'dark', apply CSS, persist to localStorage | None |
| User clicks avatar/user menu | Header | Click avatar | UserMenu dropdown opens | None |
| User clicks menu item (Profile/Settings) | UserMenu | Click link | Navigate to `/app/settings`, close menu | None |
| User clicks logout | UserMenu | Click logout button | Call logout endpoint, clear Zustand store, redirect to login | POST /auth/logout |
| User clicks breadcrumb item | Breadcrumb | Click link | Navigate to parent route | None |
| User resizes window | AppLayout | Window resize | Responsive layout updates (show/hide sidebar vs drawer) | None |
| Timeout/Session expires | App | After inactivity | User redirected to login on next action (401 from API) | Any endpoint |

## 9. Conditions and Validation

### Authentication Guard

**Condition**: User must be authenticated (have valid session token)

**Verification at Component Level**
1. `ProtectedRoute` wrapper checks `useAuthStore().isAuthenticated()`
2. If `user === null`, redirect to `/login`
3. If user exists, allow access to AppLayout and child routes

**Affected Components**
- ProtectedRoute (blocks entire `/app/*` subtree)
- AppLayout (assumes user is authenticated)
- Header (displays user info from store)

**State Effects**
- Not authenticated: Redirect to `/login`, AppLayout never renders
- Authenticated: AppLayout renders, displays user info, renders children

### User Profile Load

**Condition**: App must load current user profile on initialization

**Verification at Component Level**
1. App.tsx queries `/api/v1/auth/me` on component mount
2. If 200: Response contains `UserViewModel`, call `login()` in Zustand
3. If 401: No action (user remains null), ProtectedRoute redirects

**Affected Components**
- App.tsx (bootstrap)
- AppLayout (uses stored user)
- Header (displays user info)

**State Effects**
- Success (200): User stored in Zustand, accessible in AppLayout
- Failure (401): User remains null, redirected to login
- Network error: Retry logic in React Query

### Session Validation

**Condition**: User session remains valid throughout app usage

**Verification at Component Level**
- On each API call via interceptor: If response is 401, clear auth store and redirect
- ProtectedRoute re-checks on route changes

**Affected Components**
- API interceptor (global error handling)
- Any component making API calls

**State Effects**
- Valid session: API calls succeed (200-299 responses)
- Expired session: API call returns 401, user redirected to login
- Clear auth store to ensure consistent state

### Route Authorization

**Condition**: User can only access their own groups and resources

**Verification at Component Level**
- Backend validates group ownership on each API call
- Frontend only displays routes user has access to (via navigation items)
- No frontend-only authorization (backend is source of truth)

**Affected Components**
- Sidebar/Drawer (shows allowed routes)
- AppLayout (serves as guard for all routes)

**State Effects**
- Authorized: Route renders normally
- Unauthorized: Backend returns 403, frontend shows error toast

## 10. Error Handling

### 401 Unauthorized (Session Expired)

**Scenario**: User's session token expired or is invalid

**Detection**
- API call returns 401 status
- ProtectedRoute check finds `user === null`

**Handling**
```typescript
// In API interceptor (axios response interceptor)
if (error.response?.status === 401) {
  useAuthStore.getState().logout();
  queryClient.clear();
  window.location.href = '/login';
}

// Show toast
toast.error('Session expired. Please login again.');
```

**User Experience**
- Redirect to login page
- Display "Session expired" toast message
- User can login again

### 500 Server Error (Bootstrap Fails)

**Scenario**: Backend error when fetching `/api/v1/auth/me`

**Detection**
- Query returns error with status 500
- React Query retry exhausted

**Handling**
```typescript
const { data, error, isError } = useQuery({
  queryKey: ['auth', 'me'],
  queryFn: async () => { /* ... */ },
  retry: 2,
  onError: (error) => {
    toast.error('Failed to load user profile. Please refresh the page.');
    // Don't redirect - allow user to retry
  },
});
```

**User Experience**
- Show error toast
- Don't redirect (allows retry via refresh)
- User can refresh page to retry

### Network Error (No Internet)

**Scenario**: Network connectivity issue

**Detection**
- Request fails before reaching server (timeout, no network)

**Handling**
```typescript
const { error } = useQuery({
  queryFn: async () => { /* ... */ },
  retry: 3,
  retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 30000),
  onError: (error) => {
    if (!navigator.onLine) {
      toast.error('No internet connection. Please check your network.');
    } else {
      toast.error('Connection error. Retrying...');
    }
  },
});
```

**User Experience**
- Show appropriate error message (no internet vs connection error)
- Automatic retry with exponential backoff
- User can retry manually

### Logout Error

**Scenario**: Logout API call fails (backend error or network)

**Detection**
- `useMutation` for logout returns error

**Handling**
```typescript
const logoutMutation = useMutation({
  mutationFn: async () => await api.post('/api/v1/auth/logout'),
  onError: (error) => {
    toast.error('Logout failed. Clearing session locally.');
    // Clear locally even if backend fails
    useAuthStore.getState().logout();
    queryClient.clear();
    navigate('/login');
  },
  onSuccess: () => {
    useAuthStore.getState().logout();
    queryClient.clear();
    navigate('/login');
  },
});
```

**User Experience**
- Show error toast but still logout locally
- Redirect to login regardless (optimistic UI)

### Theme Toggle Error (Local)

**Scenario**: localStorage not available (private browsing, quota exceeded)

**Detection**
- localStorage.setItem() throws error

**Handling**
```typescript
const toggleTheme = useCallback(() => {
  try {
    setTheme(prev => prev === 'light' ? 'dark' : 'light');
    localStorage.setItem('theme', theme === 'light' ? 'dark' : 'light');
  } catch (e) {
    // Silently fail - theme still changes in memory, just not persisted
    console.warn('Failed to persist theme:', e);
    setTheme(prev => prev === 'light' ? 'dark' : 'light');
  }
}, [theme]);
```

**User Experience**
- Theme still toggles in current session
- Not persisted to localStorage
- No error message shown (transparent failure)

## 11. Implementation Steps

1. **Create AppLayout component structure**
   - Create `/frontend/src/components/AppLayout/AppLayout.tsx`
   - Create file structure: `AppLayout/Header.tsx`, `AppLayout/Sidebar.tsx`, `AppLayout/MobileDrawer.tsx`, `AppLayout/UserMenu.tsx`, `AppLayout/Breadcrumb.tsx`
   - Create `/frontend/src/hooks/useAppLayout.ts` custom hook
   - Create `/frontend/src/hooks/useBreadcrumbs.ts` custom hook

2. **Implement Header component**
   - Create responsive header with flexbox layout
   - Add Logo/brand on left
   - Add Breadcrumb in center (use `useBreadcrumbs()`)
   - Add Theme toggle button on right
   - Add Hamburger menu trigger (mobile only, hidden via Tailwind)
   - Add UserMenu component in top-right
   - Import and use `useAuthStore()` to access user
   - Pass callbacks for toggle sidebar and logout

3. **Implement Sidebar component (Desktop)**
   - Create vertical navigation panel
   - Define navigation items array (Groups, Settings, Help)
   - Style active route with highlight
   - Hide on mobile via Tailwind `lg:` breakpoint
   - Use React Router `Link` for navigation
   - Use `useLocation()` to detect active route

4. **Implement MobileDrawer component (Mobile)**
   - Create drawer overlay (fixed, z-index, slide animation)
   - Add backdrop with click-to-close
   - Display same navigation items as Sidebar
   - Auto-close on route change
   - Only visible on mobile (show via Tailwind `lg:hidden`)
   - Use CSS animations for slide-in effect or styled-components

5. **Implement UserMenu component**
   - Create avatar button with initials or icon
   - Create dropdown menu absolutely positioned
   - Add menu items: Profile, Settings, Logout
   - Manage open/close state with useState
   - Add click-outside detection (useEffect with document listener)
   - Call logout handler from UserMenu

6. **Implement Breadcrumb component**
   - Use `useBreadcrumbs()` hook to get breadcrumb items
   - Render as `<nav><ol><li>` structure
   - Display items separated by `/` or `>`
   - Make items (except last) clickable Links
   - Style last item (current page) as non-interactive text

7. **Create custom hooks**
   - `useAppLayout()` - Manage theme and sidebar state with localStorage persistence
   - `useBreadcrumbs()` - Generate breadcrumbs from current route and route config

8. **Integrate with AppLayout main component**
   - Create main container with flexbox layout
   - Render Header at top
   - Render Sidebar (desktop) and MobileDrawer (mobile) alongside RouteOutlet
   - Pass state and callbacks to child components
   - Use responsive layout (Tailwind breakpoints)

9. **Update routing in App.tsx**
   - Wrap `/app/*` route with `AppLayout` component
   - Keep ProtectedRoute guard
   - Move child routes (groups, settings) under AppLayout
   - Example structure:
     ```tsx
     {
       path: '/app',
       element: <ProtectedRoute><AppLayout /></ProtectedRoute>,
       children: [
         { path: 'groups', element: <GroupsPage /> },
         { path: 'settings', element: <SettingsPage /> },
       ],
     }
     ```

10. **Add global error handling**
    - Update API interceptor to handle 401 responses
    - Clear auth store and redirect to login on 401
    - Show error toast for other errors

11. **Implement theme support**
    - Add theme toggle in Header
    - Persist theme preference to localStorage
    - Apply theme via CSS classes or styled-components ThemeProvider
    - Create light/dark theme object with colors

12. **Add accessibility features**
    - Use semantic HTML (`<header>`, `<nav>`, `<main>`)
    - Add ARIA labels and roles
    - Implement keyboard navigation (Tab, Enter, ESC)
    - Add focus outlines (visible keyboard focus)
    - Add focus trap in UserMenu and MobileDrawer
    - Test with keyboard-only navigation
    - Implement `prefers-reduced-motion` for animations

13. **Add responsive design**
    - Use Tailwind breakpoints for responsive layout
    - Hide Sidebar on mobile (`lg:hidden`)
    - Show MobileDrawer on mobile (`block lg:hidden`)
    - Test on various screen sizes (mobile, tablet, desktop)
    - Ensure touch targets are at least 44x44px

14. **Test implementation**
    - Test auth flow: login → AppLayout renders → logout → redirect to login
    - Test navigation: click nav items → route changes → breadcrumb updates
    - Test theme toggle: toggle theme → CSS applied → localStorage persisted
    - Test responsive: resize window → layout switches sidebar/drawer
    - Test user menu: click avatar → menu opens → click logout → logout flow
    - Test mobile drawer: open drawer → click nav → drawer closes
    - Test error handling: simulate 401, network error, logout error
    - Test accessibility: keyboard navigation, screen reader, focus management
    - Test breadcrumb generation with various routes

15. **Polish and optimize**
    - Add smooth transitions/animations for theme and drawer
    - Optimize re-renders (use `useCallback`, `useMemo` where needed)
    - Add loading states during async operations
    - Add confirm dialog before logout
    - Add notification badges on nav items (if relevant for groups count)
    - Test performance with React DevTools Profiler
