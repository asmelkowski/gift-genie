import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { AlertCircle, X } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface ErrorGuidanceAlertProps {
  error: string;
  groupId: string;
}

export default function ErrorGuidanceAlert({
  error,
  groupId,
}: ErrorGuidanceAlertProps) {
  const [dismissed, setDismissed] = useState(false);
  const navigate = useNavigate();

  if (dismissed) {
    return null;
  }

  return (
    <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 mb-4">
      <div className="flex gap-4">
        <AlertCircle className="w-5 h-5 text-yellow-600 flex-shrink-0 mt-0.5" />
        <div className="flex-1">
          <h3 className="font-semibold text-yellow-900">{error}</h3>
          <p className="text-sm text-yellow-800 mt-1">
            This usually means there are too many exclusions or not enough members.
            Try:
          </p>
          <div className="flex flex-wrap gap-2 mt-3">
            <Button
              size="sm"
              variant="outline"
              onClick={() => navigate(`/app/groups/${groupId}/exclusions`)}
              className="bg-white hover:bg-gray-50"
            >
              Review Exclusions
            </Button>
            <Button
              size="sm"
              variant="outline"
              onClick={() => navigate(`/app/groups/${groupId}/members`)}
              className="bg-white hover:bg-gray-50"
            >
              Add Members
            </Button>
          </div>
        </div>
        <button
          onClick={() => setDismissed(true)}
          className="text-yellow-600 hover:text-yellow-700"
        >
          <X className="w-5 h-5" />
        </button>
      </div>
    </div>
  );
}
