import { Dialog } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { CheckCircle } from 'lucide-react';
import type { components } from '@/types/schema';

type NotifyDrawResponse = components['schemas']['NotifyDrawResponse'];

interface NotificationResultDialogProps {
  isOpen: boolean;
  onClose: () => void;
  result: NotifyDrawResponse;
}

export default function NotificationResultDialog({
  isOpen,
  onClose,
  result,
}: NotificationResultDialogProps) {
  return (
    <Dialog isOpen={isOpen} onClose={onClose} title="Notifications Sent">
      <div className="space-y-4">
        <div className="flex items-center gap-2">
          <CheckCircle className="w-6 h-6 text-green-600" />
          <span className="font-semibold text-foreground">✓ Sent: {result.sent} notifications</span>
        </div>
        {result.skipped > 0 && (
          <div>
            <p className="font-semibold text-foreground">
              ⊘ Skipped: {result.skipped} members (no email)
            </p>
          </div>
        )}
        <div className="flex gap-3 justify-end pt-4">
          <Button onClick={onClose} className="bg-blue-600 hover:bg-blue-700">
            Close
          </Button>
        </div>
      </div>
    </Dialog>
  );
}
