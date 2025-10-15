# View Implementation Plan: Login

## 1. Overview
This document outlines the implementation plan for the user Login view. The primary purpose of this view is to allow registered application users to authenticate using their email and password. Upon successful authentication, a secure session is established, and the user is redirected to the main application dashboard.

## 2. View Routing
The Login view will be accessible at the following application path:
- **Path**: `"/login"`

## 3. Component Structure
The view will be composed of a main page component that uses a feature-specific form component. Shadcn UI components will be used for the UI elements.

```
- LoginPage (View)
  - AuthLayout (Wrapper for consistent auth page styling)
    - Card
      - CardHeader (Title: "Login")
      - CardContent
        - LoginForm (Feature Component)
      - CardFooter (Link to Register page)
```

## 4. Component Details

### `LoginPage`
- **Component description**: A view component that serves as the entry point for the `/login` route. It is responsible for rendering the overall page layout and the `LoginForm`.
- **Main elements**:
  - A layout container (`AuthLayout`).
  - A `Card` component to frame the login form.
  - A `CardFooter` containing a `Link` to the registration page (`/register`).
- **Handled interactions**: None directly. It delegates all user interactions to child components.
- **Handled validation**: None.
- **Types**: None.
- **Props**: None.

### `LoginForm`
- **Component description**: A form dedicated to handling user authentication. It manages local form state, user input, validation, and communication with the authentication API.
- **Main elements**:
  - An HTML `<form>` element.
  - Shadcn `Input` component for the email field (`type="email"`).
  - Shadcn `Input` component for the password field (`type="password"`).
  - Shadcn `Label` components associated with each input.
  - Shadcn `Button` for form submission (`type="submit"`). This button will show a loading state during the API call.
  - Shadcn `Alert` and `AlertDescription` to display API-related errors (e.g., invalid credentials).
- **Handled interactions**:
  - `onChange` on input fields to update form state.
  - `onSubmit` on the form to trigger the login mutation.
- **Handled validation**:
  - **Email**: Must be a non-empty string and match a valid email format.
  - **Password**: Must be a non-empty string with a minimum length of 8 characters.
- **Types**: `LoginRequestDTO`, `UserViewModel`.
- **Props**: None.

## 5. Types
The following types will be required for implementing the view and handling API interactions.

### `LoginRequestDTO`
Represents the data payload sent to the login endpoint.
```typescript
interface LoginRequestDTO {
  email: string;
  password: string;
}
```

### `UserViewModel`
Represents the user profile data received from the backend and stored in the global state.
```typescript
interface UserViewModel {
  id: string;
  email: string;
  name: string;
}
```

### `LoginResponseDTO`
Represents the successful response body from the login endpoint.
```typescript
interface LoginResponseDTO {
  user: UserViewModel;
  token_type: "Bearer";
}
```

## 6. State Management
State will be managed using a combination of local component state and a global Zustand store.

- **Local State (`LoginForm`)**: The `LoginForm` component will manage its own form fields (email, password) and any UI-specific error messages using `useState`.
- **Global State (`useAuthStore`)**: A Zustand store will be created to manage the application-wide authentication state.
  - **State**:
    - `user: UserViewModel | null` - Stores the authenticated user's data.
    - `csrfToken: string | null` - Stores the CSRF token for API requests.
    - `isAuthenticated: boolean` - Derived from the presence of a user.
  - **Actions**:
    - `login(user: UserViewModel, token: string)`: Sets the user and CSRF token.
    - `logout()`: Clears all authentication state.

## 7. API Integration
Integration will be handled using `@tanstack/react-query` for server state management and `axios` for HTTP requests.

- **Hook**: A `useLoginMutation` custom hook will be created using `useMutation`.
- **Endpoint**: `POST /api/v1/auth/login`
- **Request Type**: `LoginRequestDTO`
- **Response Handling**:
  - On success (200 OK), the `onSuccess` callback will:
    1. Extract the `user` object from the response body.
    2. Extract the `X-CSRF-Token` from the response headers.
    3. Call the global `useAuthStore.login()` action with the user data and CSRF token.
    4. Navigate the user to `/app/groups`.
  - On error, the `onError` callback will inspect the error status code and update the `LoginForm`'s local error state.

## 8. User Interactions
- **Typing in form fields**: The component's state is updated on every keystroke.
- **Submitting the form**:
  - **Outcome**: The `useLoginMutation` is invoked. The submit button is disabled and shows a loading spinner.
  - **Success**: The user is redirected to `/app/groups`.
  - **Failure**: The loading state is removed, the button is re-enabled, and an error message is displayed within an `Alert` component.
- **Navigating to Register**: Clicking the "Register" link will navigate the user to the `/register` page.

## 9. Conditions and Validation
- **Client-Side Validation**:
  - The `LoginForm` will perform validation before submitting.
  - An email field must contain a validly formatted email address.
  - A password field must contain at least 8 characters.
  - If validation fails, the form submission is prevented, and inline error messages are displayed.
- **UI State Changes**:
  - The submit button's `disabled` attribute will be tied to the `isPending` state of the `useLoginMutation` hook and the validity of the form fields.

## 10. Error Handling
- **401 Unauthorized**: A generic "Invalid email or password" message will be displayed. This prevents leaking information about which field was incorrect.
- **429 Too Many Requests**: A message "Too many login attempts. Please try again in a moment." will be displayed.
- **Network or Server Errors (5xx)**: A generic message "An unexpected error occurred. Please try again later." will be displayed.
- **Client-Side Errors**: Validation errors will be shown inline, next to the corresponding form field.

## 11. Implementation Steps
1.  **Create Store**: Implement the `useAuthStore` using Zustand to manage `user`, `csrfToken`, and `isAuthenticated` state.
2.  **Configure API Client**: Set up a global Axios instance. Implement a request interceptor that reads the `csrfToken` from `useAuthStore` and adds it as an `X-CSRF-Token` header to all outgoing state-changing requests (`POST`, `PUT`, etc.).
3.  **Create API Hook**: Create the `useLoginMutation` custom hook. This hook will encapsulate the `useMutation` logic for the `POST /api/v1/auth/login` call, including the `onSuccess` and `onError` handlers.
4.  **Build Components**:
    - Create the `LoginForm` component with Shadcn `Input`, `Label`, and `Button` components.
    - Implement local state management for form fields and validation.
    - Integrate the `useLoginMutation` hook to handle form submission, loading states, and error display.
    - Create the `LoginPage` view component, which renders the `LoginForm` within a `Card`.
5.  **Add Routing**: Add a new route in the main router configuration for the path `/login` that renders the `LoginPage` component.
6.  **Implement Session Check**: In the main `App` component, implement a `useEffect` or `useQuery` to call a `GET /api/v1/auth/me` endpoint on initial load. If successful, use the response to hydrate the `useAuthStore`, establishing a persistent session.
7.  **Create Protected Route**: Create a `ProtectedRoute` component that checks `useAuthStore.isAuthenticated` and redirects to `/login` if the user is not authenticated. Apply this to all routes under `/app/*`.
