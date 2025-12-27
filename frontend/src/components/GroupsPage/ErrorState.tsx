import { useTranslation } from 'react-i18next';
import { Alert } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';

interface ErrorStateProps {
  error: Error;
  onRetry: () => void;
}

export function ErrorState({ error, onRetry }: ErrorStateProps) {
  const { t } = useTranslation('groups');

  return (
    <div className="space-y-4">
      <Alert variant="destructive" className="border-red-200 bg-red-50">
        <div className="font-semibold">{t('error.title')}</div>
        <div className="text-sm text-red-700 mt-1">{error.message || t('error.message')}</div>
      </Alert>
      <Button onClick={onRetry} variant="outline">
        {t('error.retryButton')}
      </Button>
    </div>
  );
}
