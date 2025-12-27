import { useTranslation } from 'react-i18next';
import { AlertCircle } from 'lucide-react';

interface ErrorStateProps {
  error: string;
}

export default function ErrorState({ error }: ErrorStateProps) {
  const { t } = useTranslation('draws');

  return (
    <div className="flex items-center justify-center py-12">
      <div className="text-center">
        <AlertCircle className="w-12 h-12 text-red-500 mx-auto mb-4" />
        <h3 className="text-lg font-semibold text-gray-900">{t('error.title')}</h3>
        <p className="text-gray-600 mt-2">{error}</p>
      </div>
    </div>
  );
}
