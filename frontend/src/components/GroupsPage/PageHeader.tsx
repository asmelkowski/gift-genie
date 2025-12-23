import { useTranslation } from 'react-i18next';
import { Button } from '@/components/ui/button';

interface PageHeaderProps {
  onCreateClick: () => void;
}

export function PageHeader({ onCreateClick }: PageHeaderProps) {
  const { t } = useTranslation('groups');

  return (
    <div
      className="flex flex-col sm:flex-row sm:items-center sm:justify-between mb-6"
      data-testid="groups-page-header"
    >
      <div>
        <h1 className="text-3xl font-bold text-foreground">{t('header.title')}</h1>
        <p className="text-gray-600 mt-1">{t('header.subtitle')}</p>
      </div>
      <Button onClick={onCreateClick} className="mt-4 sm:mt-0">
        {t('header.createButton')}
      </Button>
    </div>
  );
}
