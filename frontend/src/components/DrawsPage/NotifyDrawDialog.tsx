import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
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
  const { t } = useTranslation('draws');
  const [resend, setResend] = useState(false);

  useEffect(() => {
    setResend(false);
  }, [isOpen]);

  return (
    <Dialog isOpen={isOpen} onClose={onClose} title={t('notify.title')}>
      <div className="space-y-4">
        <p>{t('notify.confirmMessage')}</p>

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
                {t('notify.resendCheckbox')}
              </Label>
            </div>
          </div>
        )}

        <div className="flex gap-3 justify-end pt-4">
          <Button variant="outline" onClick={onClose} disabled={isLoading}>
            {t('notify.cancelButton')}
          </Button>
          <Button
            onClick={() => onConfirm(resend)}
            disabled={isLoading}
            className="bg-blue-600 hover:bg-blue-700"
          >
            {isLoading ? t('notify.sendingButton') : t('notify.sendButton')}
          </Button>
        </div>
      </div>
    </Dialog>
  );
}
