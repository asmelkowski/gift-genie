import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { BrowserRouter } from 'react-router-dom';
import { RegisterForm } from './RegisterForm';

// Mock the hook
const mockMutate = vi.fn();
vi.mock('@/hooks/useRegisterMutation', () => ({
  useRegisterMutation: () => ({
    mutate: mockMutate,
    isPending: false,
  }),
}));

const createWrapper = () => {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false },
      mutations: { retry: false },
    },
  });

  return ({ children }: { children: React.ReactNode }) => (
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        {children}
      </BrowserRouter>
    </QueryClientProvider>
  );
};

describe('RegisterForm', () => {
  beforeEach(() => {
    mockMutate.mockClear();
  });

  it('renders all form fields', () => {
    render(<RegisterForm />, { wrapper: createWrapper() });

    expect(screen.getByLabelText('Name')).toBeInTheDocument();
    expect(screen.getByLabelText('Email')).toBeInTheDocument();
    expect(screen.getByLabelText('Password')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /register/i })).toBeInTheDocument();
  });

  it('validates required name field', async () => {
    const user = userEvent.setup();
    render(<RegisterForm />, { wrapper: createWrapper() });

    const emailInput = screen.getByLabelText(/email/i);
    const passwordInput = screen.getByLabelText('Password');
    await user.type(emailInput, 'test@example.com');
    await user.type(passwordInput, 'password123');

    const form = screen.getByTestId('register-form');
    fireEvent.submit(form);

    await waitFor(() => expect(screen.getByText('Name is required')).toBeInTheDocument());
  });

  it('validates email format', async () => {
    const user = userEvent.setup();
    render(<RegisterForm />, { wrapper: createWrapper() });

    const nameInput = screen.getByLabelText(/name/i);
    const emailInput = screen.getByLabelText(/email/i);
    const passwordInput = screen.getByLabelText('Password');
    await user.type(nameInput, 'John Doe');
    await user.type(emailInput, 'invalid-email');
    await user.type(passwordInput, 'password123');

    const form = screen.getByTestId('register-form');
    fireEvent.submit(form);

    await waitFor(() => expect(screen.getByText('Please enter a valid email address')).toBeInTheDocument());
  });

  it('validates password strength', async () => {
    const user = userEvent.setup();
    render(<RegisterForm />, { wrapper: createWrapper() });

    const nameInput = screen.getByLabelText(/name/i);
    const emailInput = screen.getByLabelText(/email/i);
    const passwordInput = screen.getByLabelText('Password');

    await user.type(nameInput, 'John Doe');
    await user.type(emailInput, 'john@example.com');
    await user.type(passwordInput, 'weak');

    const form = screen.getByTestId('register-form');
    fireEvent.submit(form);

    await waitFor(() => expect(screen.getByText('Password must be at least 8 characters long')).toBeInTheDocument());
  });

  it('validates password character classes', async () => {
    const user = userEvent.setup();
    render(<RegisterForm />, { wrapper: createWrapper() });

    const nameInput = screen.getByLabelText(/name/i);
    const emailInput = screen.getByLabelText(/email/i);
    const passwordInput = screen.getByLabelText('Password');

    await user.type(nameInput, 'John Doe');
    await user.type(emailInput, 'john@example.com');
    await user.type(passwordInput, 'password123'); // only lowercase and digits

    const form = screen.getByTestId('register-form');
    fireEvent.submit(form);

    await waitFor(() => expect(screen.getByText('Password must contain at least 3 of the following: lowercase letter, uppercase letter, digit, symbol')).toBeInTheDocument());
  });

  it('validates password does not contain name', async () => {
    const user = userEvent.setup();
    render(<RegisterForm />, { wrapper: createWrapper() });

    const nameInput = screen.getByLabelText('Name');
    const emailInput = screen.getByLabelText('Email');
    const passwordInput = screen.getByLabelText('Password');

    await user.type(nameInput, 'John');
    await user.type(emailInput, 'test@example.com'); // local part 'test' not in password
    await user.type(passwordInput, 'Password123!John'); // contains name

    const form = screen.getByTestId('register-form');
    fireEvent.submit(form);

    await waitFor(() => expect(screen.getByText('Password must not contain your name')).toBeInTheDocument());
  });

  it('validates password does not contain email local part', async () => {
    const user = userEvent.setup();
    render(<RegisterForm />, { wrapper: createWrapper() });

    const nameInput = screen.getByLabelText(/name/i);
    const emailInput = screen.getByLabelText(/email/i);
    const passwordInput = screen.getByLabelText('Password');

    await user.type(nameInput, 'John Doe');
    await user.type(emailInput, 'john@example.com');
    await user.type(passwordInput, 'Password123!john'); // contains email local part

    const submitButton = screen.getByRole('button', { name: /register/i });
    await user.click(submitButton);

    expect(screen.getByText('Password must not contain your email username')).toBeInTheDocument();
  });

  it('submits form with valid data', async () => {
    const user = userEvent.setup();
    render(<RegisterForm />, { wrapper: createWrapper() });

    const nameInput = screen.getByLabelText(/name/i);
    const emailInput = screen.getByLabelText(/email/i);
    const passwordInput = screen.getByLabelText('Password');

    await user.type(nameInput, 'John Doe');
    await user.type(emailInput, 'john@example.com');
    await user.type(passwordInput, 'Password123!');

    const submitButton = screen.getByRole('button', { name: /register/i });
    await user.click(submitButton);

    expect(mockMutate).toHaveBeenCalledWith({
      email: 'john@example.com',
      password: 'Password123!',
      name: 'John Doe',
    }, expect.any(Object));
  });

  it('toggles password visibility', async () => {
    const user = userEvent.setup();
    render(<RegisterForm />, { wrapper: createWrapper() });

    const passwordInput = screen.getByLabelText('Password');
    const toggleButton = screen.getByRole('button', { name: /show password/i }); // Assuming the button has this text

    // Initially password should be hidden
    expect(passwordInput).toHaveAttribute('type', 'password');

    await user.click(toggleButton);

    // After toggle, should be text
    expect(passwordInput).toHaveAttribute('type', 'text');
  });

  it('clears errors when user starts typing', async () => {
    const user = userEvent.setup();
    render(<RegisterForm />, { wrapper: createWrapper() });

    const emailInput = screen.getByLabelText(/email/i);
    const passwordInput = screen.getByLabelText('Password');
    await user.type(emailInput, 'test@example.com');
    await user.type(passwordInput, 'password123');

    const form = screen.getByTestId('register-form');
    fireEvent.submit(form);

    await waitFor(() => expect(screen.getByText('Name is required')).toBeInTheDocument());

    const nameInput = screen.getByLabelText(/name/i);
    await user.type(nameInput, 'J');

    await waitFor(() => expect(screen.queryByText('Name is required')).not.toBeInTheDocument());
  });
});