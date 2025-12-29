import { useTranslation } from 'react-i18next';
import { Dialog } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';

interface FinalizeConfirmationDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  isLoading: boolean;
}

export default function FinalizeConfirmationDialog({
  isOpen,
  onClose,
  onConfirm,
  isLoading,
}: FinalizeConfirmationDialogProps) {
  const { t } = useTranslation('draws');

  return (
    <Dialog isOpen={isOpen} onClose={onClose} title={t('finalize.title')}>
      <div className="space-y-4">
        <div className="space-y-3">
          <p>{t('finalize.confirmMessage')}</p>
          <p className="font-semibold text-foreground">{t('finalize.warningMessage')}</p>
        </div>
        <div className="flex flex-col-reverse sm:flex-row gap-2 sm:gap-3 sm:justify-end pt-4">
          <Button
            variant="outline"
            onClick={onClose}
            disabled={isLoading}
            className="w-full sm:w-auto"
          >
            {t('finalize.cancelButton')}
          </Button>
          <Button
            onClick={onConfirm}
            disabled={isLoading}
            className="w-full sm:w-auto bg-blue-600 hover:bg-blue-700"
          >
            {isLoading ? t('finalize.finalizingButton') : t('finalize.confirmButton')}
          </Button>
        </div>
      </div>
    </Dialog>
  );
}
