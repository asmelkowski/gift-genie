import AssignmentRow from './AssignmentRow';
import type { AssignmentWithNames } from '@/lib/drawUtils';

interface AssignmentsTableProps {
  assignments: AssignmentWithNames[];
}

export default function AssignmentsTable({ assignments }: AssignmentsTableProps) {
  return (
    <div className="border border-gray-200 rounded-lg overflow-hidden">
      {/* Table layout for larger screens */}
      <div className="hidden md:block overflow-x-auto">
        <table className="w-full">
          <thead className="bg-gray-50 border-b border-gray-200">
            <tr>
              <th className="px-6 py-3 text-left text-sm font-semibold text-gray-900 w-5/12">
                Giver
              </th>
              <th className="px-6 py-3 text-center text-sm font-semibold text-gray-900 w-2/12">
              </th>
              <th className="px-6 py-3 text-left text-sm font-semibold text-gray-900 w-5/12">
                Receiver
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200">
            {assignments.map((assignment) => (
              <AssignmentRow key={assignment.id} assignment={assignment} />
            ))}
          </tbody>
        </table>
      </div>

      {/* Card layout for smaller screens */}
      <div className="md:hidden flex flex-col gap-3 p-4">
        {assignments.map((assignment) => (
          <div
            key={assignment.id}
            className="flex items-center gap-3 p-4 bg-gray-50 rounded"
          >
            <div className="flex-1">
              <p className="font-medium text-gray-900">{assignment.giver_name}</p>
            </div>
            <span className="text-gray-500">→</span>
            <div className="flex-1 text-right">
              <p className="font-medium text-gray-900">{assignment.receiver_name}</p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
