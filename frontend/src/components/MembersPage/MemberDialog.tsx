import { useState } from 'react';
import { Alert } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { MemberForm } from './MemberForm';
import type { components } from '@/types/schema';

type MemberResponse = components['schemas']['MemberResponse'];

interface MemberDialogProps {
  isOpen: boolean;
  onClose: () => void;
  member: MemberResponse | null;
  groupId: string;
}

export function MemberDialog({ isOpen, onClose, member, groupId }: MemberDialogProps) {
  const [pendingDrawAlert, setPendingDrawAlert] = useState<string | null>(null);
  const title = member ? 'Edit Member' : 'Add Member';

  const handlePendingDrawAlert = (message: string) => {
    setPendingDrawAlert(message);
  };

  const closePendingDrawAlert = () => {
    setPendingDrawAlert(null);
  };

  if (!isOpen) {
    return null;
  }

  return (
    <>
      <div className="fixed inset-0 z-50 bg-black/50" onClick={onClose} />
      <div className="fixed left-[50%] top-[50%] z-50 w-full max-w-sm translate-x-[-50%] translate-y-[-50%] rounded-lg border bg-white p-6 shadow-lg max-h-[90vh] overflow-y-auto">
        <h2 className="text-lg font-semibold mb-4">{title}</h2>

        {pendingDrawAlert && (
          <div className="mb-4 space-y-3">
            <Alert variant="destructive" className="border-red-200 bg-red-50">
              <div className="text-sm text-red-700 font-medium mb-2">Cannot Deactivate Member</div>
              <div className="text-sm text-red-700">{pendingDrawAlert}</div>
            </Alert>
            <Button onClick={closePendingDrawAlert} variant="outline" className="w-full">
              OK
            </Button>
          </div>
        )}

        <MemberForm
          member={member}
          groupId={groupId}
          onSuccess={onClose}
          onCancel={onClose}
          onPendingDrawAlert={handlePendingDrawAlert}
        />
      </div>
    </>
  );
}
