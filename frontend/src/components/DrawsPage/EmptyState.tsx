import { useTranslation } from 'react-i18next';
import { Dice5 } from 'lucide-react';

export default function EmptyState() {
  const { t } = useTranslation('draws');

  return (
    <div className="flex items-center justify-center py-12">
      <div className="text-center">
        <Dice5 className="w-12 h-12 text-gray-400 mx-auto mb-4" />
        <h3 className="text-lg font-semibold text-gray-900">{t('empty.title')}</h3>
        <p className="text-gray-600 mt-2">{t('empty.description')}</p>
      </div>
    </div>
  );
}
