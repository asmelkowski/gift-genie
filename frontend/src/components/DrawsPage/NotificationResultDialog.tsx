import { useTranslation } from 'react-i18next';
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
  const { t } = useTranslation('draws');

  return (
    <Dialog isOpen={isOpen} onClose={onClose} title={t('notifyResult.title')}>
      <div className="space-y-4">
        <div className="flex items-center gap-2">
          <CheckCircle className="w-6 h-6 text-green-600" />
          <span className="font-semibold text-foreground">
            {t('notifyResult.sentMessage', { count: result.sent })}
          </span>
        </div>
        {result.skipped > 0 && (
          <div>
            <p className="font-semibold text-foreground">
              {t('notifyResult.skippedMessage', { count: result.skipped })}
            </p>
          </div>
        )}
        <div className="flex gap-3 justify-end pt-4">
          <Button onClick={onClose} className="bg-blue-600 hover:bg-blue-700">
            {t('notifyResult.closeButton')}
          </Button>
        </div>
      </div>
    </Dialog>
  );
}
