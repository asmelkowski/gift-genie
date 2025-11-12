import { Label } from '@/components/ui/label';

interface DrawsToolbarProps {
  status: 'all' | 'pending' | 'finalized';
  onStatusChange: (status: 'all' | 'pending' | 'finalized') => void;
  sort: string;
  onSortChange: (sort: string) => void;
}

const STATUS_OPTIONS = [
  { value: 'all', label: 'All Draws' },
  { value: 'pending', label: 'Pending' },
  { value: 'finalized', label: 'Finalized' },
];

const SORT_OPTIONS = [
  { value: '-created_at', label: 'Created (Newest)' },
  { value: 'created_at', label: 'Created (Oldest)' },
  { value: '-finalized_at', label: 'Finalized (Newest)' },
  { value: 'finalized_at', label: 'Finalized (Oldest)' },
];

export default function DrawsToolbar({
  status,
  onStatusChange,
  sort,
  onSortChange,
}: DrawsToolbarProps) {
  return (
    <div className="flex flex-col sm:flex-row gap-4 mb-6">
      <div className="sm:w-48">
        <Label htmlFor="status" className="sr-only">
          Filter by status
        </Label>
        <select
          id="status"
          value={status}
          onChange={e => onStatusChange(e.target.value as 'all' | 'pending' | 'finalized')}
          className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
        >
          {STATUS_OPTIONS.map(opt => (
            <option key={opt.value} value={opt.value}>
              {opt.label}
            </option>
          ))}
        </select>
      </div>
      <div className="sm:w-48">
        <Label htmlFor="sort" className="sr-only">
          Sort by
        </Label>
        <select
          id="sort"
          value={sort}
          onChange={e => onSortChange(e.target.value)}
          className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
        >
          {SORT_OPTIONS.map(opt => (
            <option key={opt.value} value={opt.value}>
              {opt.label}
            </option>
          ))}
        </select>
      </div>
    </div>
  );
}
