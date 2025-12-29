import { useTranslation } from 'react-i18next';
import { Button } from '@/components/ui/button';

interface PageHeaderProps {
  onAddClick: () => void;
}

export function PageHeader({ onAddClick }: PageHeaderProps) {
  const { t } = useTranslation('members');

  return (
    <div data-testid="members-page-header">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-3xl font-bold text-foreground">{t('header.title')}</h1>
          <p className="text-gray-600 mt-1">{t('header.subtitle')}</p>
        </div>
        <Button onClick={onAddClick} className="mt-4 sm:mt-0" aria-label={t('header.addButton')}>
          {t('header.addButton')}
        </Button>
      </div>
    </div>
  );
}
