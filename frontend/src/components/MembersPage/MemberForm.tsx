import { useState, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
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
  language: string;
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

export function MemberForm({
  member,
  groupId,
  onSuccess,
  onCancel,
  onPendingDrawAlert,
}: MemberFormProps) {
  const { t } = useTranslation('members');
  const [formData, setFormData] = useState<MemberFormData>({
    name: member?.name || '',
    email: member?.email || '',
    is_active: member?.is_active ?? true,
    language: member?.language || 'en',
  });
  const [errors, setErrors] = useState<MemberFormErrors>({});
  const [touched, setTouched] = useState({ name: false, email: false });

  const [apiError, setApiError] = useState<string | null>(null);

  const handleCreateError = useCallback(
    (detail: string) => {
      if (detail === 'name_conflict_in_group') {
        setErrors(prev => ({
          ...prev,
          name: t('form.errors.nameConflict'),
        }));
      } else if (detail === 'email_conflict_in_group') {
        setErrors(prev => ({
          ...prev,
          email: t('form.errors.emailConflict'),
        }));
      } else {
        setApiError(detail || 'Failed to add member');
      }
    },
    [t]
  );

  const handleUpdateError = useCallback(
    (detail: string) => {
      if (detail === 'name_conflict_in_group') {
        setErrors(prev => ({
          ...prev,
          name: t('form.errors.nameConflict'),
        }));
      } else if (detail === 'email_conflict_in_group') {
        setErrors(prev => ({
          ...prev,
          email: t('form.errors.emailConflict'),
        }));
      } else if (detail === 'cannot_deactivate_due_to_pending_draw') {
        onPendingDrawAlert?.(t('form.errors.cannotDeactivate'));
      } else {
        setApiError(detail || 'Failed to update member');
      }
    },
    [onPendingDrawAlert, t]
  );

  const createMutation = useCreateMemberMutation(groupId, handleCreateError);
  const updateMutation = useUpdateMemberMutation(groupId, handleUpdateError);
  const isLoading = createMutation.isPending || updateMutation.isPending;

  const validateName = useCallback(
    (name: string): string | undefined => {
      const trimmed = name.trim();
      if (!trimmed) return t('form.errors.nameRequired');
      if (trimmed.length > 100) return t('form.errors.nameTooLong');
      return undefined;
    },
    [t]
  );

  const validateEmail = useCallback(
    (email: string): string | undefined => {
      if (!email) return undefined;
      if (!EMAIL_REGEX.test(email)) return t('form.errors.emailInvalid');
      return undefined;
    },
    [t]
  );

  const handleNameChange = useCallback(
    (value: string) => {
      setFormData(prev => ({ ...prev, name: value }));
      if (touched.name) {
        setErrors(prev => ({ ...prev, name: validateName(value) }));
      }
    },
    [touched.name, validateName]
  );

  const handleEmailChange = useCallback(
    (value: string) => {
      setFormData(prev => ({ ...prev, email: value }));
      if (touched.email) {
        setErrors(prev => ({ ...prev, email: validateEmail(value) }));
      }
    },
    [touched.email, validateEmail]
  );

  const handleNameBlur = useCallback(() => {
    setTouched(prev => ({ ...prev, name: true }));
    setErrors(prev => ({ ...prev, name: validateName(formData.name) }));
  }, [formData.name, validateName]);

  const handleEmailBlur = useCallback(() => {
    setTouched(prev => ({ ...prev, email: true }));
    setErrors(prev => ({ ...prev, email: validateEmail(formData.email) }));
  }, [formData.email, validateEmail]);

  const hasErrors = Object.values(errors).some(error => error);

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
          language: formData.language,
        };
        updateMutation.mutate({ memberId: member.id, payload }, { onSuccess });
      } else {
        const payload: CreateMemberRequest = {
          name: formData.name.trim(),
          email: formData.email || undefined,
          is_active: formData.is_active,
          language: formData.language,
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
        <Label htmlFor="name">{t('form.nameLabelRequired')}</Label>
        <Input
          id="name"
          value={formData.name}
          onChange={e => handleNameChange(e.target.value)}
          onBlur={handleNameBlur}
          maxLength={100}
          placeholder={t('form.namePlaceholder')}
          className={errors.name ? 'border-red-500' : ''}
          disabled={isLoading}
        />
        {errors.name && <p className="text-sm text-red-600 mt-1">{errors.name}</p>}
      </div>

      <div>
        <Label htmlFor="email">{t('form.emailLabel')}</Label>
        <Input
          id="email"
          type="email"
          value={formData.email}
          onChange={e => handleEmailChange(e.target.value)}
          onBlur={handleEmailBlur}
          placeholder={t('form.emailPlaceholder')}
          className={errors.email ? 'border-red-500' : ''}
          disabled={isLoading}
        />
        {errors.email && <p className="text-sm text-red-600 mt-1">{errors.email}</p>}
      </div>

      <div>
        <Label htmlFor="language">{t('form.languageLabel')}</Label>
        <select
          id="language"
          value={formData.language}
          onChange={e => setFormData(prev => ({ ...prev, language: e.target.value }))}
          className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
          disabled={isLoading}
        >
          <option value="en">{t('form.languageOptions.en')}</option>
          <option value="pl">{t('form.languageOptions.pl')}</option>
        </select>
      </div>

      <div className="flex items-center gap-2">
        <input
          id="is_active"
          type="checkbox"
          checked={formData.is_active}
          onChange={e => setFormData(prev => ({ ...prev, is_active: e.target.checked }))}
          disabled={isLoading}
          className="h-4 w-4"
          aria-label={t('form.activeCheckboxLabel')}
        />
        <Label htmlFor="is_active" className="cursor-pointer mb-0">
          {t('form.activeCheckboxLabel')}
        </Label>
      </div>
      <p className="text-sm text-muted-foreground">{t('form.activeCheckboxHelpText')}</p>

      <div className="flex flex-col-reverse sm:flex-row gap-2 pt-4">
        <Button
          type="button"
          variant="outline"
          onClick={onCancel}
          disabled={isLoading}
          className="w-full sm:w-auto"
        >
          {t('form.cancelButton')}
        </Button>
        <Button type="submit" disabled={hasErrors || isLoading} className="w-full sm:w-auto">
          {isLoading ? t('form.savingButton') : member ? t('form.saveButton') : t('form.addButton')}
        </Button>
      </div>
    </form>
  );
}
