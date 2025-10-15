# Register View Implementation Plan

## 1. Overview
The register view allows new users to create an admin account for Gift Genie by providing their name, email, and password. Upon successful registration, users are redirected to the login page with a success toast notification. The view includes inline validation, password visibility toggle, and clear error handling for conflicts and invalid inputs.

## 2. View Routing
The view is accessible at the path "/register".

## 3. Component Structure
- RegisterPage (main page component)
  - RegisterForm (form container)
    - Input (name field)
    - Input (email field)
    - PasswordInput (password field with visibility toggle)
    - Button (submit)
    - ErrorMessage (displays errors)

## 4. Component Details
### RegisterPage
- Component description: The main page component that wraps the registration form and handles the overall layout for the register view.
- Main elements: A centered container with the RegisterForm component.
- Handled interactions: None directly; delegates to child components.
- Handled validation: None.
- Types: None specific.
- Props: None.

### RegisterForm
- Component description: The core form component that collects user input for name, email, and password, handles form submission, and displays errors.
- Main elements: Form element containing input fields, password input with toggle, submit button, and error display.
- Handled interactions: Form submission, input changes, password visibility toggle.
- Handled validation: Required fields (name, email, password), email format, password strength (minimum 8 characters, at least 3 of 4 character classes: lowercase, uppercase, digit, symbol; must not contain email local part or name).
- Types: RegisterRequest for API payload, RegisterFormState for local state.
- Props: None (self-contained).

### PasswordInput
- Component description: A specialized input component for password entry with a visibility toggle button.
- Main elements: Input field for password and a button to toggle visibility.
- Handled interactions: Input changes, toggle button click.
- Handled validation: Password strength as part of form validation.
- Types: string for value, boolean for showPassword.
- Props: value: string, onChange: (value: string) => void, showPassword: boolean, onToggle: () => void.

### ErrorMessage
- Component description: A component to display error messages, either field-specific or general.
- Main elements: Text element for error message.
- Handled interactions: None.
- Handled validation: None.
- Types: string for message.
- Props: message: string.

## 5. Types
- RegisterRequest: { email: string; password: string; name: string; } - DTO for API request payload.
- UserCreatedResponse: { id: string; email: string; name: string; created_at: string; } - DTO for API success response.
- RegisterFormState: { email: string; password: string; name: string; showPassword: boolean; errors: Record<string, string>; isSubmitting: boolean; } - ViewModel for form state, including user inputs, toggle state, validation errors, and submission status.

## 6. State Management
State is managed locally within the RegisterForm component using React's useState hook for RegisterFormState. The form state includes input values, password visibility toggle, field-specific errors, and submission loading state. No custom hook is required beyond the standard useState, as the logic is straightforward. API interactions use React Query's useMutation for handling the registration request, success redirection, and error setting.

## 7. API Integration
The view integrates with the POST /api/v1/auth/register endpoint. The request payload is RegisterRequest { email: string, password: string, name: string }. On success (201), it returns UserCreatedResponse { id: string, email: string, name: string, created_at: string }. Errors include 400 for invalid_payload (e.g., weak password) and 409 for email_conflict.

## 8. User Interactions
- User fills in the name, email, and password fields.
- User can toggle password visibility using the button in PasswordInput.
- User submits the form by clicking the submit button.
- On successful submission, a success toast is shown and the user is redirected to "/login".
- On validation or API errors, relevant error messages are displayed inline.

## 9. Conditions and Validation
- Name: Required, non-empty string.
- Email: Required, valid email format, must be unique (checked via API).
- Password: Required, minimum 8 characters, at least 3 of 4 character classes (lowercase, uppercase, digit, symbol), must not contain the email's local part (before @) or the name (case-insensitive).
- These conditions are verified at the component level for immediate feedback and re-verified by the API. Errors affect the interface by displaying messages below fields and disabling the submit button during submission.

## 10. Error Handling
- 409 email_conflict: Display "Email already in use" under the email field.
- 400 invalid_payload: Parse and display field-specific messages (e.g., "Weak password" under password field).
- Network or other errors: Display a general error message at the top of the form.
- Validation errors: Show inline messages for required fields, invalid email, or weak password.

## 11. Implementation Steps
1. Create RegisterPage component in src/pages/RegisterPage.tsx with basic layout.
2. Implement RegisterForm component with form state and input handlers.
3. Add PasswordInput component with visibility toggle.
4. Implement ErrorMessage component for displaying errors.
5. Add form validation logic mirroring backend rules.
6. Integrate React Query useMutation for API call.
7. Handle success: Show toast and redirect to "/login".
8. Handle errors: Set state errors based on API response.
9. Style components using TailwindCss and Shadcn.
10. Test form validation, submission, and error scenarios.