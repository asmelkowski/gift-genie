import { useState } from 'react';
import { Alert } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Dialog } from '@/components/ui/dialog';
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

  return (
    <Dialog isOpen={isOpen} onClose={onClose} title={title} testId="member-dialog">
      <div className="space-y-4">
        {pendingDrawAlert && (
          <div className="space-y-3">
            <Alert
              variant="destructive"
              className="border-red-200 bg-red-50 dark:bg-red-950/20 dark:border-red-900/50"
            >
              <div className="text-sm text-red-700 dark:text-red-400 font-medium mb-2">
                Cannot Deactivate Member
              </div>
              <div className="text-sm text-red-700 dark:text-red-400">{pendingDrawAlert}</div>
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
    </Dialog>
  );
}
