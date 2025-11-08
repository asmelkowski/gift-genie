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
  return (
    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between mb-6">
      <div>
        <h1 className="text-3xl font-bold text-gray-900">Draw Results</h1>
        <p className="text-gray-600 mt-1">
          {groupName || 'Group'} - Draw #{draw.id.slice(0, 8)}
        </p>
      </div>
      <ExportActions assignments={assignments} drawId={draw.id} groupName={groupName} />
    </div>
  );
}
