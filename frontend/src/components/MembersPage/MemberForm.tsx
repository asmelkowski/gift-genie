import { useState, useCallback } from 'react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Alert } from '@/components/ui/alert';
import { useCreateMemberMutation } from '@/hooks/useCreateMemberMutation';
import { useUpdateMemberMutation } from '@/hooks/useUpdateMemberMutation';
import type { components } from '@/types/schema';

type MemberResponse = components['schemas']['MemberResponse'];
type CreateMemberRequest = components['schemas']['CreateMemberRequest'];
type UpdateMemberRequest = components['schemas']['UpdateMemberRequest'];

interface MemberFormData {
  name: string;
  email: string;
  is_active: boolean;
}

interface MemberFormErrors {
  name?: string;
  email?: string;
}

export interface MemberFormProps {
  member: MemberResponse | null;
  groupId: string;
  onSuccess: () => void;
  onCancel: () => void;
  onPendingDrawAlert?: (message: string) => void;
}

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function MemberForm({ member, groupId, onSuccess, onCancel, onPendingDrawAlert }: MemberFormProps) {
  const [formData, setFormData] = useState<MemberFormData>({
    name: member?.name || '',
    email: member?.email || '',
    is_active: member?.is_active ?? true,
  });
  const [errors, setErrors] = useState<MemberFormErrors>({});
  const [touched, setTouched] = useState({ name: false, email: false });

  const [apiError, setApiError] = useState<string | null>(null);

  const handleCreateError = useCallback(
    (detail: string) => {
      if (detail === 'name_conflict_in_group') {
        setErrors((prev) => ({
          ...prev,
          name: 'This name is already used by another member',
        }));
      } else if (detail === 'email_conflict_in_group') {
        setErrors((prev) => ({
          ...prev,
          email: 'This email is already used by another member',
        }));
      } else {
        setApiError(detail || 'Failed to add member');
      }
    },
    []
  );

  const handleUpdateError = useCallback((detail: string) => {
    if (detail === 'name_conflict_in_group') {
      setErrors((prev) => ({
        ...prev,
        name: 'This name is already used by another member',
      }));
    } else if (detail === 'email_conflict_in_group') {
      setErrors((prev) => ({
        ...prev,
        email: 'This email is already used by another member',
      }));
    } else if (detail === 'cannot_deactivate_due_to_pending_draw') {
      onPendingDrawAlert?.(
        'Cannot deactivate this member because they are part of a pending draw. Please finalize or delete the draw first.'
      );
    } else {
      setApiError(detail || 'Failed to update member');
    }
  }, [onPendingDrawAlert]);

  const createMutation = useCreateMemberMutation(groupId, handleCreateError);
  const updateMutation = useUpdateMemberMutation(groupId, handleUpdateError);
  const isLoading = createMutation.isPending || updateMutation.isPending;

  const validateName = useCallback((name: string): string | undefined => {
    const trimmed = name.trim();
    if (!trimmed) return 'Name is required';
    if (trimmed.length > 100) return 'Name must be 100 characters or less';
    return undefined;
  }, []);

  const validateEmail = useCallback((email: string): string | undefined => {
    if (!email) return undefined;
    if (!EMAIL_REGEX.test(email)) return 'Please enter a valid email address';
    return undefined;
  }, []);

  const handleNameChange = useCallback((value: string) => {
    setFormData((prev) => ({ ...prev, name: value }));
    if (touched.name) {
      setErrors((prev) => ({ ...prev, name: validateName(value) }));
    }
  }, [touched.name, validateName]);

  const handleEmailChange = useCallback((value: string) => {
    setFormData((prev) => ({ ...prev, email: value }));
    if (touched.email) {
      setErrors((prev) => ({ ...prev, email: validateEmail(value) }));
    }
  }, [touched.email, validateEmail]);

  const handleNameBlur = useCallback(() => {
    setTouched((prev) => ({ ...prev, name: true }));
    setErrors((prev) => ({ ...prev, name: validateName(formData.name) }));
  }, [formData.name, validateName]);

  const handleEmailBlur = useCallback(() => {
    setTouched((prev) => ({ ...prev, email: true }));
    setErrors((prev) => ({ ...prev, email: validateEmail(formData.email) }));
  }, [formData.email, validateEmail]);

  const hasErrors = Object.values(errors).some((error) => error);

  const handleSubmit = useCallback(
    async (e: React.FormEvent) => {
      e.preventDefault();

      const nameError = validateName(formData.name);
      const emailError = validateEmail(formData.email);

      setErrors({ name: nameError, email: emailError });

      if (nameError || emailError) {
        return;
      }

      if (member) {
        const payload: UpdateMemberRequest = {
          name: formData.name.trim(),
          email: formData.email || undefined,
          is_active: formData.is_active,
        };
        updateMutation.mutate(
          { memberId: member.id, payload },
          { onSuccess }
        );
      } else {
        const payload: CreateMemberRequest = {
          name: formData.name.trim(),
          email: formData.email || undefined,
          is_active: formData.is_active,
        };
        createMutation.mutate(payload, { onSuccess });
      }
    },
    [formData, member, validateName, validateEmail, createMutation, updateMutation, onSuccess]
  );

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {apiError && (
        <Alert variant="destructive" className="border-red-200 bg-red-50">
          <div className="text-sm text-red-700">{apiError}</div>
        </Alert>
      )}

      <div>
        <Label htmlFor="name">
          Name <span className="text-red-600">*</span>
        </Label>
        <Input
          id="name"
          value={formData.name}
          onChange={(e) => handleNameChange(e.target.value)}
          onBlur={handleNameBlur}
          maxLength={100}
          placeholder="Enter member name"
          className={errors.name ? 'border-red-500' : ''}
          disabled={isLoading}
        />
        {errors.name && <p className="text-sm text-red-600 mt-1">{errors.name}</p>}
      </div>

      <div>
        <Label htmlFor="email">Email (optional)</Label>
        <Input
          id="email"
          type="email"
          value={formData.email}
          onChange={(e) => handleEmailChange(e.target.value)}
          onBlur={handleEmailBlur}
          placeholder="Enter member email"
          className={errors.email ? 'border-red-500' : ''}
          disabled={isLoading}
        />
        {errors.email && <p className="text-sm text-red-600 mt-1">{errors.email}</p>}
      </div>

      <div className="flex items-center gap-2">
        <input
          id="is_active"
          type="checkbox"
          checked={formData.is_active}
          onChange={(e) => setFormData((prev) => ({ ...prev, is_active: e.target.checked }))}
          disabled={isLoading}
          className="h-4 w-4"
          aria-label="Mark member as active"
        />
        <Label htmlFor="is_active" className="cursor-pointer mb-0">
          Active member
        </Label>
      </div>
      <p className="text-sm text-gray-600">Inactive members are excluded from draws</p>

      <div className="flex gap-2 pt-4">
        <Button type="button" variant="outline" onClick={onCancel} disabled={isLoading}>
          Cancel
        </Button>
        <Button type="submit" disabled={hasErrors || isLoading}>
          {isLoading ? 'Saving...' : member ? 'Save Changes' : 'Add Member'}
        </Button>
      </div>
    </form>
  );
}
