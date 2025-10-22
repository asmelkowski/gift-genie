import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

interface AssignmentsToolbarProps {
  search: string;
  onSearchChange: (search: string) => void;
  sort: 'giver_asc' | 'giver_desc' | 'receiver_asc' | 'receiver_desc';
  onSortChange: (sort: string) => void;
}

const SORT_OPTIONS = [
  { value: 'giver_asc', label: 'Giver (A-Z)' },
  { value: 'giver_desc', label: 'Giver (Z-A)' },
  { value: 'receiver_asc', label: 'Receiver (A-Z)' },
  { value: 'receiver_desc', label: 'Receiver (Z-A)' },
];

export default function AssignmentsToolbar({
  search,
  onSearchChange,
  sort,
  onSortChange,
}: AssignmentsToolbarProps) {
  return (
    <div className="flex flex-col sm:flex-row gap-4">
      <div className="flex-1">
        <Label htmlFor="search" className="sr-only">
          Search assignments
        </Label>
        <Input
          id="search"
          type="text"
          placeholder="Search by giver or receiver name..."
          value={search}
          onChange={(e) => onSearchChange(e.target.value)}
          maxLength={100}
        />
      </div>
      <div className="sm:w-48">
        <Label htmlFor="sort" className="sr-only">
          Sort by
        </Label>
        <select
          id="sort"
          value={sort}
          onChange={(e) => onSortChange(e.target.value)}
          className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
        >
          {SORT_OPTIONS.map((opt) => (
            <option key={opt.value} value={opt.value}>
              {opt.label}
            </option>
          ))}
        </select>
      </div>
    </div>
  );
}
