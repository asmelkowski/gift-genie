import { useCallback } from 'react';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import type { components } from '@/types/schema';

type GroupSummary = components['schemas']['GroupSummary'];

interface GroupCardProps {
  group: GroupSummary;
  onClick: (groupId: string) => void;
}

export function GroupCard({ group, onClick }: GroupCardProps) {
  const handleClick = useCallback(() => {
    onClick(group.id);
  }, [group.id, onClick]);

  const formattedDate = new Intl.DateTimeFormat('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  }).format(new Date(group.created_at));

  const exclusionsLabel = group.historical_exclusions_enabled
    ? `Historical exclusions: ${group.historical_exclusions_lookback} draw${group.historical_exclusions_lookback !== 1 ? 's' : ''}`
    : 'No historical exclusions';

  return (
    <Card
      onClick={handleClick}
      className="cursor-pointer hover:shadow-lg transition-shadow"
      data-testid={`group-card-${group.id}`}
    >
      <CardHeader className="pb-3">
        <h3 className="font-semibold text-lg truncate" data-testid="group-card-name">{group.name}</h3>
      </CardHeader>
      <CardContent className="space-y-2">
        <p className="text-sm text-gray-500">Created {formattedDate}</p>
        <p className="text-sm text-gray-600">{exclusionsLabel}</p>
      </CardContent>
    </Card>
  );
}
