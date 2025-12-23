import { useTranslation } from 'react-i18next';
import ExportActions from './ExportActions';
import type { components } from '@/types/schema';
import type { AssignmentWithNames } from '@/lib/drawUtils';

type DrawResponse = components['schemas']['DrawResponse'];

interface PageHeaderProps {
  draw: DrawResponse;
  assignments: AssignmentWithNames[];
  groupName?: string;
}

export default function PageHeader({ draw, assignments, groupName }: PageHeaderProps) {
  const { t } = useTranslation('draws');

  return (
    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between mb-6">
      <div>
        <h1 className="text-3xl font-bold text-foreground">{t('results.pageTitle')}</h1>
        <p className="text-gray-600 mt-1">
          {t('results.subtitle', { groupName: groupName || 'Group', drawId: draw.id.slice(0, 8) })}
        </p>
      </div>
      <ExportActions assignments={assignments} drawId={draw.id} groupName={groupName} />
    </div>
  );
}
