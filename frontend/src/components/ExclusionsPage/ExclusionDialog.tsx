import { useState } from 'react';
import { ExclusionForm } from './ExclusionForm';
import type { components } from '@/types/schema';

type MemberResponse = components['schemas']['MemberResponse'];

interface ExclusionDialogProps {
  isOpen: boolean;
  onClose: () => void;
  members: MemberResponse[];
  groupId: string;
  onSubmit: (giver_member_id: string, receiver_member_id: string, is_mutual: boolean) => Promise<void>;
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

  const handleSubmit = async (giver_member_id: string, receiver_member_id: string, is_mutual: boolean) => {
    setLocalLoading(true);
    try {
      await onSubmit(giver_member_id, receiver_member_id, is_mutual);
      onClose();
    } finally {
      setLocalLoading(false);
    }
  };

  if (!isOpen) {
    return null;
  }

  return (
    <>
      <div className="fixed inset-0 z-50 bg-black/50" onClick={onClose} />
      <div className="fixed left-[50%] top-[50%] z-50 w-full max-w-sm translate-x-[-50%] translate-y-[-50%] rounded-lg border bg-white p-6 shadow-lg max-h-[90vh] overflow-y-auto">
        <h2 className="text-lg font-semibold mb-4">Create Exclusion</h2>

        <ExclusionForm
          members={members}
          onSubmit={handleSubmit}
          onCancel={onClose}
          isLoading={localLoading || isLoading}
        />
      </div>
    </>
  );
}
