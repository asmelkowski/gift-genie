import { useTranslation } from 'react-i18next';
import { Button } from '@/components/ui/button';

interface PageHeaderProps {
  groupId: string;
  groupName?: string;
  onCreateClick: () => void;
  isLoading?: boolean;
}

export default function PageHeader({ onCreateClick, isLoading }: PageHeaderProps) {
  const { t } = useTranslation('draws');

  return (
    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between mb-6">
      <div>
        <h1 className="text-3xl font-bold text-foreground">{t('header.title')}</h1>
        <p className="text-gray-600 mt-1">{t('header.subtitle')}</p>
      </div>
      <Button onClick={onCreateClick} className="mt-4 sm:mt-0" disabled={isLoading}>
        Create Draw
      </Button>
    </div>
  );
}
