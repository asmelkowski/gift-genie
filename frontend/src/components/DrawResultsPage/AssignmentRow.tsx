import type { AssignmentWithNames } from '@/lib/drawUtils';

interface AssignmentRowProps {
  assignment: AssignmentWithNames;
}

export default function AssignmentRow({ assignment }: AssignmentRowProps) {
  return (
    <tr className="hover:bg-gray-50 transition-colors">
      <td className="px-6 py-4 text-sm text-gray-900 font-medium">{assignment.giver_name}</td>
      <td className="px-6 py-4 text-center text-gray-500">→</td>
      <td className="px-6 py-4 text-sm text-gray-900 font-medium">{assignment.receiver_name}</td>
    </tr>
  );
}
