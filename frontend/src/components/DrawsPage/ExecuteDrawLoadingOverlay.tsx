import { useTranslation } from 'react-i18next';
import { Loader } from 'lucide-react';

interface ExecuteDrawLoadingOverlayProps {
  isVisible: boolean;
  message?: string;
}

export default function ExecuteDrawLoadingOverlay({
  isVisible,
  message,
}: ExecuteDrawLoadingOverlayProps) {
  const { t } = useTranslation('draws');

  if (!isVisible) {
    return null;
  }

  const displayMessage = message || t('execute.loadingMessage');

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg p-8 text-center">
        <Loader className="w-8 h-8 text-blue-600 animate-spin mx-auto mb-4" />
        <p className="text-gray-700 font-medium">{displayMessage}</p>
      </div>
    </div>
  );
}
