import { MemberCard } from './MemberCard';
import type { components } from '@/types/schema';

type MemberResponse = components['schemas']['MemberResponse'];

interface MembersGridProps {
  members: MemberResponse[];
  onMemberEdit: (member: MemberResponse) => void;
  onMemberDelete: (memberId: string) => void;
}

export function MembersGrid({ members, onMemberEdit, onMemberDelete }: MembersGridProps) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
      {members.map((member) => (
        <MemberCard
          key={member.id}
          member={member}
          onEdit={onMemberEdit}
          onDelete={onMemberDelete}
        />
      ))}
    </div>
  );
}
