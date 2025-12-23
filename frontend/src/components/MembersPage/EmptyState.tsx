import { useTranslation } from 'react-i18next';
import { Button } from '@/components/ui/button';

interface EmptyStateProps {
  onAddClick: () => void;
}

export function EmptyState({ onAddClick }: EmptyStateProps) {
  const { t } = useTranslation('members');

  return (
    <div className="text-center py-12">
      <h3 className="text-lg font-semibold text-gray-900 mb-2">{t('empty.title')}</h3>
      <p className="text-gray-600 mb-6">{t('empty.description')}</p>
      <Button onClick={onAddClick}>{t('empty.addButton')}</Button>
    </div>
  );
}
