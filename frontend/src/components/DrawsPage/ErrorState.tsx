import { AlertCircle } from 'lucide-react';

interface ErrorStateProps {
  error: string;
}

export default function ErrorState({ error }: ErrorStateProps) {
  return (
    <div className="flex items-center justify-center py-12">
      <div className="text-center">
        <AlertCircle className="w-12 h-12 text-red-500 mx-auto mb-4" />
        <h3 className="text-lg font-semibold text-gray-900">{error}</h3>
        <p className="text-gray-600 mt-2">Failed to load draws. Please try again.</p>
      </div>
    </div>
  );
}
