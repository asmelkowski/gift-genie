import { useState, useEffect } from 'react';
import { Dialog } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import type { DrawViewModel } from '@/lib/drawUtils';

interface NotifyDrawDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (resend: boolean) => Promise<void>;
  draw: DrawViewModel;
  isLoading: boolean;
}

export default function NotifyDrawDialog({
  isOpen,
  onClose,
  onConfirm,
  draw,
  isLoading,
}: NotifyDrawDialogProps) {
  const [resend, setResend] = useState(false);

  useEffect(() => {
    setResend(false);
  }, [isOpen]);

  return (
    <Dialog isOpen={isOpen} onClose={onClose} title="Send Notifications">
      <div className="space-y-4">
        <p>Members will receive email notifications with their assignments.</p>

        {draw.isNotified && (
          <div className="bg-yellow-50 border border-yellow-200 rounded p-3">
            <div className="flex items-start gap-2">
              <input
                id="resend"
                type="checkbox"
                checked={resend}
                onChange={e => setResend(e.target.checked)}
                disabled={isLoading}
                className="mt-1"
              />
              <Label htmlFor="resend" className="text-sm text-gray-700 cursor-pointer">
                Resend to all members (notifications were previously sent)
              </Label>
            </div>
          </div>
        )}

        <div className="flex gap-3 justify-end pt-4">
          <Button variant="outline" onClick={onClose} disabled={isLoading}>
            Cancel
          </Button>
          <Button
            onClick={() => onConfirm(resend)}
            disabled={isLoading}
            className="bg-blue-600 hover:bg-blue-700"
          >
            {isLoading ? 'Sending...' : 'Send'}
          </Button>
        </div>
      </div>
    </Dialog>
  );
}
