import { useState } from 'react';
import { Button } from '@/components/ui/button';
import type { components } from '@/types/schema';

type ExclusionResponse = components['schemas']['ExclusionResponse'];
type MemberResponse = components['schemas']['MemberResponse'];

interface ExclusionCardProps {
  exclusion: ExclusionResponse;
  giverName?: string;
  receiverName?: string;
  giverMember?: MemberResponse;
  receiverMember?: MemberResponse;
  onDelete: (exclusionId: string) => void;
  isLoading?: boolean;
}

export function ExclusionCard({
  exclusion,
  giverName = 'Unknown',
  receiverName = 'Unknown',
  giverMember,
  receiverMember,
  onDelete,
  isLoading = false,
}: ExclusionCardProps) {
  const [expanded, setExpanded] = useState(false);
  const isHistorical = exclusion.exclusion_type === 'historical';

  const exclusionTypeLabel = isHistorical ? 'Historical' : 'Manual';
  const mutualLabel = exclusion.is_mutual ? '↔' : '→';

  const giverStatusBadge = giverMember && !giverMember.is_active && (
    <span className="inline-block ml-1 px-2 py-0.5 text-xs bg-gray-200 text-gray-700 rounded">
      Inactive
    </span>
  );

  const receiverStatusBadge = receiverMember && !receiverMember.is_active && (
    <span className="inline-block ml-1 px-2 py-0.5 text-xs bg-gray-200 text-gray-700 rounded">
      Inactive
    </span>
  );

  const truncateUuid = (uuid: string) => uuid.slice(0, 8) + '...';

  return (
    <div className="border rounded-lg p-4 bg-white hover:shadow-md transition-shadow">
      <div className="flex items-start justify-between mb-3">
        <div className="flex-1">
          <div className="flex items-center gap-2 mb-2">
            <span className="text-xs font-semibold px-2 py-1 rounded-full bg-blue-100 text-blue-700">
              {exclusionTypeLabel}
            </span>
            {exclusion.is_mutual && (
              <span className="text-xs font-semibold px-2 py-1 rounded-full bg-purple-100 text-purple-700">
                Mutual
              </span>
            )}
          </div>

          {!isHistorical && (
            <button
              onClick={() => setExpanded(!expanded)}
              className="w-full text-left hover:bg-gray-50 p-2 rounded transition-colors"
            >
              <div className="flex items-center gap-2 mb-1">
                <span className="font-mono text-sm text-gray-700">
                  {truncateUuid(exclusion.giver_member_id)}
                </span>
                <span className="text-gray-400 font-semibold">{mutualLabel}</span>
                <span className="font-mono text-sm text-gray-700">
                  {truncateUuid(exclusion.receiver_member_id)}
                </span>
                <svg
                  className={`w-4 h-4 text-gray-400 transition-transform ${
                    expanded ? 'rotate-180' : ''
                  }`}
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M19 14l-7 7m0 0l-7-7m7 7V3"
                  />
                </svg>
              </div>
            </button>
          )}

          {isHistorical && (
            <div className="flex items-center gap-2 mb-1 p-2">
              <span className="font-mono text-sm text-gray-700">
                {truncateUuid(exclusion.giver_member_id)}
              </span>
              <span className="text-gray-400 font-semibold">{mutualLabel}</span>
              <span className="font-mono text-sm text-gray-700">
                {truncateUuid(exclusion.receiver_member_id)}
              </span>
            </div>
          )}

          {expanded && !isHistorical && (
            <div className="mt-3 pt-3 border-t border-gray-200 space-y-2">
              <div className="text-sm">
                <div className="text-gray-600 font-medium mb-1">From:</div>
                <div className="flex items-center gap-2">
                  <span className="font-medium text-gray-900">{giverName}</span>
                  {giverStatusBadge}
                </div>
                {giverMember?.email && (
                  <div className="text-xs text-gray-500 mt-1">{giverMember.email}</div>
                )}
              </div>

              <div className="text-sm">
                <div className="text-gray-600 font-medium mb-1">To:</div>
                <div className="flex items-center gap-2">
                  <span className="font-medium text-gray-900">{receiverName}</span>
                  {receiverStatusBadge}
                </div>
                {receiverMember?.email && (
                  <div className="text-xs text-gray-500 mt-1">{receiverMember.email}</div>
                )}
              </div>

              <div className="text-xs text-gray-500">
                Created: {new Date(exclusion.created_at).toLocaleDateString()}
              </div>
            </div>
          )}

          <div className="text-xs text-gray-500 px-2">
            Created: {new Date(exclusion.created_at).toLocaleDateString()}
          </div>
        </div>
      </div>

      {exclusion.exclusion_type === 'manual' && (
        <Button
          onClick={() => onDelete(exclusion.id)}
          variant="destructive"
          size="sm"
          disabled={isLoading}
          className="w-full"
        >
          Delete
        </Button>
      )}
      {exclusion.exclusion_type === 'historical' && (
        <div className="text-xs text-gray-500 italic text-center py-2">
          System-generated from previous draws
        </div>
      )}
    </div>
  );
}
