import { useCallback, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import type { components } from '@/types/schema';

type GroupSummary = components['schemas']['GroupSummary'];

interface GroupCardProps {
  group: GroupSummary;
  onClick: (groupId: string) => void;
}

export function GroupCard({ group, onClick }: GroupCardProps) {
  const { t, i18n } = useTranslation('groups');
  const handleClick = useCallback(() => {
    onClick(group.id);
  }, [group.id, onClick]);

  const formattedDate = useMemo(() => {
    return new Intl.DateTimeFormat(i18n.language, {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    }).format(new Date(group.created_at));
  }, [group.created_at, i18n.language]);

  const exclusionsLabel = group.historical_exclusions_enabled
    ? t('card.historicalExclusions', { count: group.historical_exclusions_lookback })
    : t('card.noHistoricalExclusions');

  return (
    <Card onClick={handleClick} className="cursor-pointer hover:shadow-lg transition-shadow">
      <CardHeader className="pb-3">
        <h3 className="font-semibold text-lg truncate">{group.name}</h3>
      </CardHeader>
      <CardContent className="space-y-2">
        <p className="text-sm text-gray-500">{t('card.created', { date: formattedDate })}</p>
        <p className="text-sm text-gray-600">{exclusionsLabel}</p>
      </CardContent>
    </Card>
  );
}
