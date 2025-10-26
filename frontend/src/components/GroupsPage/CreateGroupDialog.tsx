import { useCallback, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Dialog } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useCreateGroupMutation } from '@/hooks/useCreateGroupMutation';
import type { components } from '@/types/schema';

type CreateGroupRequest = components['schemas']['CreateGroupRequest'];

interface CreateGroupDialogProps {
  isOpen: boolean;
  onClose: () => void;
}

interface FormData {
  name: string;
  historical_exclusions_enabled: boolean;
  historical_exclusions_lookback: number;
}

interface FormErrors {
  name?: string;
  historical_exclusions_lookback?: string;
}

export function CreateGroupDialog({ isOpen, onClose }: CreateGroupDialogProps) {
  const navigate = useNavigate();
  const [formData, setFormData] = useState<FormData>({
    name: '',
    historical_exclusions_enabled: true,
    historical_exclusions_lookback: 1,
  });
  const [errors, setErrors] = useState<FormErrors>({});
  const mutation = useCreateGroupMutation();

  const validateField = useCallback(
    (field: keyof FormData, value: string | number | boolean): string | undefined => {
      if (field === 'name') {
        const str = value as string;
        const trimmed = str.trim();
        if (!trimmed) {
          return 'Group name is required';
        }
        if (trimmed.length < 1 || trimmed.length > 100) {
          return 'Group name must be between 1 and 100 characters';
        }
      }

      if (field === 'historical_exclusions_lookback') {
        const num = value as number;
        if (formData.historical_exclusions_enabled) {
          if (num < 1 || !Number.isInteger(num)) {
            return 'Lookback must be a positive integer';
          }
        }
      }

      return undefined;
    },
    [formData.historical_exclusions_enabled]
  );

  const handleNameChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const value = e.target.value;
      setFormData((prev) => ({ ...prev, name: value }));
    },
    []
  );

  const handleNameBlur = useCallback(() => {
    const error = validateField('name', formData.name);
    setErrors((prev) => ({
      ...prev,
      name: error,
    }));
  }, [formData.name, validateField]);

  const handleExclusionsChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const checked = e.target.checked;
      setFormData((prev) => ({
        ...prev,
        historical_exclusions_enabled: checked,
      }));
      setErrors((prev) => ({ ...prev, historical_exclusions_lookback: undefined }));
    },
    []
  );

  const handleLookbackChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const value = parseInt(e.target.value, 10);
      if (!isNaN(value)) {
        setFormData((prev) => ({
          ...prev,
          historical_exclusions_lookback: value,
        }));
      }
    },
    []
  );

  const handleLookbackBlur = useCallback(() => {
    const error = validateField(
      'historical_exclusions_lookback',
      formData.historical_exclusions_lookback
    );
    setErrors((prev) => ({
      ...prev,
      historical_exclusions_lookback: error,
    }));
  }, [formData.historical_exclusions_lookback, validateField]);

  const handleSubmit = useCallback(
    async (e: React.FormEvent) => {
      e.preventDefault();

      const nameError = validateField('name', formData.name);
      const lookbackError = validateField(
        'historical_exclusions_lookback',
        formData.historical_exclusions_lookback
      );

      if (nameError || lookbackError) {
        setErrors({
          name: nameError,
          historical_exclusions_lookback: lookbackError,
        });
        return;
      }

      const payload: CreateGroupRequest = {
        name: formData.name.trim(),
        historical_exclusions_enabled: formData.historical_exclusions_enabled,
        historical_exclusions_lookback: formData.historical_exclusions_enabled
          ? formData.historical_exclusions_lookback
          : null,
      };

      const data = await mutation.mutateAsync(payload);
      setFormData({
        name: '',
        historical_exclusions_enabled: true,
        historical_exclusions_lookback: 1,
      });
      setErrors({});
      onClose();
      navigate(`/app/groups/${data.id}/members`);
    },
    [formData, validateField, mutation, onClose, navigate]
  );

  const handleClose = useCallback(() => {
    setFormData({
      name: '',
      historical_exclusions_enabled: true,
      historical_exclusions_lookback: 1,
    });
    setErrors({});
    onClose();
  }, [onClose]);

  return (
    <Dialog isOpen={isOpen} onClose={handleClose} title="Create Group" data-testid="create-group-dialog">
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <Label htmlFor="group-name">Group Name *</Label>
          <Input
            id="group-name"
            type="text"
            value={formData.name}
            onChange={handleNameChange}
            onBlur={handleNameBlur}
            placeholder="Enter group name"
            maxLength={100}
            className={errors.name ? 'border-red-500' : ''}
            data-testid="group-name-input"
          />
           {errors.name && <p className="text-sm text-red-500 mt-1" data-testid="group-name-error">{errors.name}</p>}
        </div>

        <div className="flex items-center gap-2">
          <input
            id="exclusions-enabled"
            type="checkbox"
            checked={formData.historical_exclusions_enabled}
            onChange={handleExclusionsChange}
            className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
            data-testid="historical-exclusions-checkbox"
          />
          <Label htmlFor="exclusions-enabled" className="mb-0">
            Enable historical exclusions
          </Label>
        </div>

        {formData.historical_exclusions_enabled && (
          <div>
            <Label htmlFor="lookback">Lookback (draws)</Label>
            <Input
              id="lookback"
              type="number"
              min="1"
              value={formData.historical_exclusions_lookback}
              onChange={handleLookbackChange}
              onBlur={handleLookbackBlur}
              className={errors.historical_exclusions_lookback ? 'border-red-500' : ''}
              data-testid="lookback-input"
            />
             {errors.historical_exclusions_lookback && (
               <p className="text-sm text-red-500 mt-1" data-testid="lookback-error">
                 {errors.historical_exclusions_lookback}
               </p>
             )}
          </div>
        )}

        <div className="flex gap-2 justify-end pt-4">
          <Button
            type="button"
            variant="outline"
            onClick={handleClose}
            disabled={mutation.isPending}
            data-testid="cancel-create-group"
          >
            Cancel
          </Button>
          <Button type="submit" disabled={mutation.isPending} data-testid="submit-create-group">
            {mutation.isPending ? 'Creating...' : 'Create'}
          </Button>
        </div>
      </form>
    </Dialog>
  );
}
