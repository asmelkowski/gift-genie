import type { AssignmentWithNames } from '@/lib/drawUtils';

interface AssignmentRowProps {
  assignment: AssignmentWithNames;
}

export default function AssignmentRow({ assignment }: AssignmentRowProps) {
  return (
    <tr className="hover:bg-muted/50 transition-colors">
      <td className="px-6 py-4 text-sm text-foreground font-medium">{assignment.giver_name}</td>
      <td className="px-6 py-4 text-center text-gray-500">→</td>
      <td className="px-6 py-4 text-sm text-foreground font-medium">{assignment.receiver_name}</td>
    </tr>
  );
}
