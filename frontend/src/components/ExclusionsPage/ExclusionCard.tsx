import { useState } from 'react';
import { useTranslation } from 'react-i18next';
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
  const { t } = useTranslation('exclusions');
  const [expanded, setExpanded] = useState(false);
  const isHistorical = exclusion.exclusion_type === 'historical';

  const exclusionTypeLabel = isHistorical ? t('card.typeHistorical') : t('card.typeManual');
  const mutualLabel = exclusion.is_mutual ? '↔' : '→';

  const giverStatusBadge = giverMember && !giverMember.is_active && (
    <span className="inline-block ml-1 px-2 py-0.5 text-xs bg-muted text-muted-foreground rounded">
      {t('card.inactiveLabel')}
    </span>
  );

  const receiverStatusBadge = receiverMember && !receiverMember.is_active && (
    <span className="inline-block ml-1 px-2 py-0.5 text-xs bg-muted text-muted-foreground rounded">
      {t('card.inactiveLabel')}
    </span>
  );

  const truncateUuid = (uuid: string) => uuid.slice(0, 8) + '...';

  return (
    <div className="border rounded-lg p-4 bg-card text-card-foreground hover:shadow-md transition-shadow">
      <div className="flex items-start justify-between mb-3">
        <div className="flex-1">
          <div className="flex items-center gap-2 mb-2">
            <span className="text-xs font-semibold px-2 py-1 rounded-full bg-primary/10 text-primary">
              {exclusionTypeLabel}
            </span>
            {exclusion.is_mutual && (
              <span className="text-xs font-semibold px-2 py-1 rounded-full bg-secondary/10 text-secondary">
                {t('card.mutualLabel')}
              </span>
            )}
          </div>

          {!isHistorical && (
            <button
              onClick={() => setExpanded(!expanded)}
              className="w-full text-left hover:bg-muted/50 p-2 rounded transition-colors"
            >
              <div className="flex items-center gap-2 mb-1">
                <span className="font-mono text-sm text-muted-foreground group-hover:text-foreground">
                  {truncateUuid(exclusion.giver_member_id)}
                </span>
                <span className="text-muted-foreground font-semibold">{mutualLabel}</span>
                <span className="font-mono text-sm text-muted-foreground group-hover:text-foreground">
                  {truncateUuid(exclusion.receiver_member_id)}
                </span>
                <svg
                  className={`w-4 h-4 text-muted-foreground transition-transform ${
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
              <span className="font-mono text-sm text-muted-foreground">
                {truncateUuid(exclusion.giver_member_id)}
              </span>
              <span className="text-muted-foreground font-semibold">{mutualLabel}</span>
              <span className="font-mono text-sm text-muted-foreground">
                {truncateUuid(exclusion.receiver_member_id)}
              </span>
            </div>
          )}

          {expanded && !isHistorical && (
            <div className="mt-3 pt-3 border-t border-border space-y-2">
              <div className="text-sm">
                <div className="text-muted-foreground font-medium mb-1">{t('card.fromLabel')}</div>
                <div className="flex items-center gap-2">
                  <span className="font-medium text-foreground">{giverName}</span>
                  {giverStatusBadge}
                </div>
                {giverMember?.email && (
                  <div className="text-xs text-muted-foreground mt-1">{giverMember.email}</div>
                )}
              </div>

              <div className="text-sm">
                <div className="text-muted-foreground font-medium mb-1">{t('card.toLabel')}</div>
                <div className="flex items-center gap-2">
                  <span className="font-medium text-foreground">{receiverName}</span>
                  {receiverStatusBadge}
                </div>
                {receiverMember?.email && (
                  <div className="text-xs text-muted-foreground mt-1">{receiverMember.email}</div>
                )}
              </div>

              <div className="text-xs text-muted-foreground">
                {t('card.createdLabel')}: {new Date(exclusion.created_at).toLocaleDateString()}
              </div>
            </div>
          )}

          <div className="text-xs text-muted-foreground px-2">
            {t('card.createdLabel')}: {new Date(exclusion.created_at).toLocaleDateString()}
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
          {t('card.deleteButton')}
        </Button>
      )}
      {exclusion.exclusion_type === 'historical' && (
        <div className="text-xs text-muted-foreground italic text-center py-2">
          {t('card.systemGeneratedNote')}
        </div>
      )}
    </div>
  );
}
