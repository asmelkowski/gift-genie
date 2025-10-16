import { GroupCard } from './GroupCard';
import type { components } from '@/types/schema';

type GroupSummary = components['schemas']['GroupSummary'];

interface GroupsGridProps {
  groups: GroupSummary[];
  onGroupClick: (groupId: string) => void;
}

export function GroupsGrid({ groups, onGroupClick }: GroupsGridProps) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
      {groups.map((group) => (
        <GroupCard key={group.id} group={group} onClick={onGroupClick} />
      ))}
    </div>
  );
}
