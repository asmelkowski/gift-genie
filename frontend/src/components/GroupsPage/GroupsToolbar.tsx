import { useCallback, useMemo, useState } from 'react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

interface GroupsToolbarProps {
  search: string;
  sort: string;
  onSearchChange: (value: string) => void;
  onSortChange: (value: string) => void;
}

const SORT_OPTIONS = [
  { value: '-created_at', label: 'Newest first' },
  { value: 'created_at', label: 'Oldest first' },
  { value: 'name', label: 'Name (A-Z)' },
  { value: '-name', label: 'Name (Z-A)' },
];

export function GroupsToolbar({ search, sort, onSearchChange, onSortChange }: GroupsToolbarProps) {
  const [inputValue, setInputValue] = useState(search);

  const handleSearchChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const value = e.target.value;
      setInputValue(value);
      const trimmed = value.trim();
      if (trimmed.length <= 100) {
        onSearchChange(trimmed);
      }
    },
    [onSearchChange]
  );

  const handleSortChange = useCallback(
    (e: React.ChangeEvent<HTMLSelectElement>) => {
      onSortChange(e.target.value);
    },
    [onSortChange]
  );

  const isValidSort = useMemo(() => SORT_OPTIONS.some(opt => opt.value === sort), [sort]);

  return (
    <div className="flex flex-col sm:flex-row gap-4 mb-6">
      <div className="flex-1">
        <Label htmlFor="search" className="sr-only">
          Search groups
        </Label>
        <Input
          id="search"
          type="text"
          placeholder="Search groups..."
          value={inputValue}
          onChange={handleSearchChange}
          maxLength={100}
        />
      </div>
      <div className="sm:w-48">
        <Label htmlFor="sort" className="sr-only">
          Sort by
        </Label>
        <select
          id="sort"
          value={isValidSort ? sort : '-created_at'}
          onChange={handleSortChange}
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
