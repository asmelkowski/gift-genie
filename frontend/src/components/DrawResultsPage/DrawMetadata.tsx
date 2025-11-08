import { Mail, CheckCircle } from 'lucide-react';
import { formatDrawTimestamp } from '@/lib/drawUtils';
import type { components } from '@/types/schema';

type DrawResponse = components['schemas']['DrawResponse'];

interface DrawMetadataProps {
  draw: DrawResponse;
  assignmentCount: number;
  groupName?: string;
}

export default function DrawMetadata({ draw, assignmentCount, groupName }: DrawMetadataProps) {
  const statusColor =
    draw.status === 'finalized' ? 'bg-green-100 text-green-800' : 'bg-yellow-100 text-yellow-800';

  const statusText = draw.status === 'finalized' ? 'Finalized' : 'Pending Finalization';

  return (
    <div className="bg-white border border-gray-200 rounded-lg p-6">
      {draw.status !== 'finalized' && (
        <div className="mb-4 p-3 bg-yellow-50 border border-yellow-200 rounded-md">
          <p className="text-sm text-yellow-800">
            <strong>Preview Mode:</strong> These results are not yet finalized. You can review them
            before committing to finalize the draw.
          </p>
        </div>
      )}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div>
          <h3 className="text-sm font-semibold text-gray-900 mb-4">Draw Information</h3>
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-gray-600">Status:</span>
              <span className={`px-3 py-1 rounded-full text-sm font-semibold ${statusColor}`}>
                {statusText}
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-gray-600">Created:</span>
              <span className="text-gray-900">{formatDrawTimestamp(draw.created_at)}</span>
            </div>
            {draw.finalized_at && (
              <div className="flex items-center justify-between">
                <span className="text-gray-600">Finalized:</span>
                <span className="text-gray-900">{formatDrawTimestamp(draw.finalized_at)}</span>
              </div>
            )}
          </div>
        </div>

        <div>
          <h3 className="text-sm font-semibold text-gray-900 mb-4">Notification Status</h3>
          <div className="space-y-3">
            {draw.notification_sent_at ? (
              <>
                <div className="flex items-center gap-2">
                  <Mail className="w-5 h-5 text-green-600" />
                  <span className="text-green-700 font-medium">Sent</span>
                </div>
                <p className="text-sm text-gray-600">
                  {formatDrawTimestamp(draw.notification_sent_at)}
                </p>
              </>
            ) : (
              <div className="flex items-center gap-2">
                <Mail className="w-5 h-5 text-gray-400" />
                <span className="text-gray-600">Not yet sent</span>
              </div>
            )}
          </div>
        </div>
      </div>

      <div className="mt-6 pt-6 border-t border-gray-200">
        <div className="flex items-center justify-between">
          <span className="text-gray-600">{groupName && `${groupName} - `}Assignments:</span>
          <div className="flex items-center gap-2">
            <CheckCircle className="w-5 h-5 text-green-600" />
            <span className="text-lg font-semibold text-gray-900">{assignmentCount}</span>
          </div>
        </div>
      </div>
    </div>
  );
}
