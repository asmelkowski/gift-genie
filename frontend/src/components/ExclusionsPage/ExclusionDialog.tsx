import { useState } from 'react';
import { Dialog } from '@/components/ui/dialog';
import { ExclusionForm } from './ExclusionForm';
import type { components } from '@/types/schema';

type MemberResponse = components['schemas']['MemberResponse'];

interface ExclusionDialogProps {
  isOpen: boolean;
  onClose: () => void;
  members: MemberResponse[];
  groupId: string;
  onSubmit: (
    giver_member_id: string,
    receiver_member_id: string,
    is_mutual: boolean
  ) => Promise<void>;
  isLoading?: boolean;
}

export function ExclusionDialog({
  isOpen,
  onClose,
  members,
  onSubmit,
  isLoading = false,
}: ExclusionDialogProps) {
  const [localLoading, setLocalLoading] = useState(false);

  const handleSubmit = async (
    giver_member_id: string,
    receiver_member_id: string,
    is_mutual: boolean
  ) => {
    setLocalLoading(true);
    try {
      await onSubmit(giver_member_id, receiver_member_id, is_mutual);
      onClose();
    } finally {
      setLocalLoading(false);
    }
  };

  return (
    <Dialog isOpen={isOpen} onClose={onClose} title="Create Exclusion" testId="exclusion-dialog">
      <ExclusionForm
        members={members}
        onSubmit={handleSubmit}
        onCancel={onClose}
        isLoading={localLoading || isLoading}
      />
    </Dialog>
  );
}
