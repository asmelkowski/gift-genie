import { useState } from 'react';
import { AxiosError } from 'axios';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { PasswordInput } from '@/components/PasswordInput';
import { ErrorMessage } from '@/components/ErrorMessage';
import { useRegisterMutation } from '@/hooks/useRegisterMutation';

interface RegisterFormState {
  email: string;
  password: string;
  name: string;
  showPassword: boolean;
  errors: Record<string, string>;
  isSubmitting: boolean;
}

export function RegisterForm() {
  const [formState, setFormState] = useState<RegisterFormState>({
    email: '',
    password: '',
    name: '',
    showPassword: false,
    errors: {},
    isSubmitting: false,
  });

  const registerMutation = useRegisterMutation();

  const updateFormState = (updates: Partial<RegisterFormState>) => {
    setFormState(prev => ({ ...prev, ...updates }));
  };

  const handleInputChange = (field: keyof RegisterFormState) => (
    e: React.ChangeEvent<HTMLInputElement>
  ) => {
    const value = e.target.value;
    updateFormState({ [field]: value });
    // Clear error for this field when user starts typing
    if (formState.errors[field]) {
      updateFormState({ errors: { ...formState.errors, [field]: '' } });
    }
  };

  const handlePasswordToggle = () => {
    updateFormState({ showPassword: !formState.showPassword });
  };

  const validateName = (name: string): string => {
    if (!name.trim()) {
      return 'Name is required';
    }
    return '';
  };

  const validateEmail = (email: string): string => {
    if (!email.trim()) {
      return 'Email is required';
    }
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return 'Please enter a valid email address';
    }
    return '';
  };

  const validatePassword = (password: string, email: string, name: string): string => {
    if (!password) {
      return 'Password is required';
    }
    if (password.length < 8) {
      return 'Password must be at least 8 characters long';
    }

    // Check for at least 3 of 4 character classes
    const hasLowercase = /[a-z]/.test(password);
    const hasUppercase = /[A-Z]/.test(password);
    const hasDigit = /\d/.test(password);
    const hasSymbol = /[^\w\s]/.test(password);

    const characterClasses = [hasLowercase, hasUppercase, hasDigit, hasSymbol].filter(Boolean).length;
    if (characterClasses < 3) {
      return 'Password must contain at least 3 of the following: lowercase letter, uppercase letter, digit, symbol';
    }

    // Must not contain email local part or name
    const emailLocalPart = email.split('@')[0]?.toLowerCase();
    const nameLower = name.toLowerCase();
    if (emailLocalPart && password.toLowerCase().includes(emailLocalPart)) {
      return 'Password must not contain your email username';
    }
    if (nameLower && password.toLowerCase().includes(nameLower)) {
      return 'Password must not contain your name';
    }

    return '';
  };

  const validateForm = (): boolean => {
    const errors: Record<string, string> = {};
    errors.name = validateName(formState.name);
    errors.email = validateEmail(formState.email);
    errors.password = validatePassword(formState.password, formState.email, formState.name);

    // Remove empty errors
    Object.keys(errors).forEach(key => {
      if (!errors[key]) delete errors[key];
    });

    updateFormState({ errors });
    return Object.keys(errors).length === 0;
  };

  const isFormValid = formState.name.trim() !== '' || formState.email.trim() !== '' || formState.password !== '';

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (validateForm()) {
      registerMutation.mutate(
        {
          email: formState.email,
          password: formState.password,
          name: formState.name,
        },
        {
          onError: (error: AxiosError) => {
            const status = error.response?.status;
            if (status === 409) {
              updateFormState({ errors: { email: 'Email already in use' } });
            } else if (status === 400) {
              // Parse field-specific errors from response
              const responseData = error.response?.data;
              if (responseData?.detail) {
                const fieldErrors: Record<string, string> = {};
                responseData.detail.forEach((detail: any) => {
                  if (detail.loc && detail.loc.length > 1) {
                    const field = detail.loc[1];
                    fieldErrors[field] = detail.msg;
                  }
                });
                updateFormState({ errors: fieldErrors });
              } else {
                updateFormState({ errors: { general: 'Invalid registration data' } });
              }
            } else {
              updateFormState({ errors: { general: 'An unexpected error occurred. Please try again later.' } });
            }
          },
        }
      );
    }
  };

  return (
    <form data-testid="register-form" onSubmit={handleSubmit} className="space-y-4">
      {formState.errors.general && <ErrorMessage message={formState.errors.general} />}
      <div className="space-y-2">
        <Label htmlFor="name">Name</Label>
        <Input
          id="name"
          type="text"
          value={formState.name}
          onChange={handleInputChange('name')}
          required
        />
        {formState.errors.name && <ErrorMessage message={formState.errors.name} />}
      </div>

      <div className="space-y-2">
        <Label htmlFor="email">Email</Label>
        <Input
          id="email"
          type="email"
          value={formState.email}
          onChange={handleInputChange('email')}
          required
        />
        {formState.errors.email && <ErrorMessage message={formState.errors.email} />}
      </div>

      <div className="space-y-2">
        <Label htmlFor="password">Password</Label>
        <PasswordInput
          value={formState.password}
          onChange={handleInputChange('password')}
          showPassword={formState.showPassword}
          onToggle={handlePasswordToggle}
        />
        {formState.errors.password && <ErrorMessage message={formState.errors.password} />}
      </div>

      <Button
        type="submit"
        className="w-full"
        disabled={registerMutation.isPending || !isFormValid}
      >
        {registerMutation.isPending ? 'Registering...' : 'Register'}
      </Button>
    </form>
  );
}