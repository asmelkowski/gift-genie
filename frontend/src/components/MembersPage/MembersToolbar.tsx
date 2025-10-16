import { useCallback, useState, useEffect } from 'react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';

interface MembersToolbarProps {
  isActive: boolean | null;
  search: string;
  sort: string;
  onActiveFilterChange: (value: boolean | null) => void;
  onSearchChange: (value: string) => void;
  onSortChange: (value: string) => void;
}

export function MembersToolbar({
  isActive,
  search,
  sort,
  onActiveFilterChange,
  onSearchChange,
  onSortChange,
}: MembersToolbarProps) {
  const [searchInput, setSearchInput] = useState(search);
  const [searchTimeout, setSearchTimeout] = useState<NodeJS.Timeout | null>(null);

  useEffect(() => {
    setSearchInput(search);
  }, [search]);

  const handleSearchChange = useCallback(
    (value: string) => {
      setSearchInput(value);
      if (searchTimeout) clearTimeout(searchTimeout);
      const timeout = setTimeout(() => {
        onSearchChange(value);
      }, 300);
      setSearchTimeout(timeout);
    },
    [onSearchChange, searchTimeout]
  );

  const handleClearSearch = useCallback(() => {
    setSearchInput('');
    onSearchChange('');
  }, [onSearchChange]);

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row gap-4">
        <div className="flex gap-2" role="group" aria-label="Filter members by active status">
          <Button
            variant={isActive === null ? 'default' : 'outline'}
            onClick={() => onActiveFilterChange(null)}
            aria-pressed={isActive === null}
          >
            All
          </Button>
          <Button
            variant={isActive === true ? 'default' : 'outline'}
            onClick={() => onActiveFilterChange(true)}
            aria-pressed={isActive === true}
          >
            Active
          </Button>
          <Button
            variant={isActive === false ? 'default' : 'outline'}
            onClick={() => onActiveFilterChange(false)}
            aria-pressed={isActive === false}
          >
            Inactive
          </Button>
        </div>

        <div className="flex-1">
          <div className="relative">
            <Input
              placeholder="Search by name or email..."
              value={searchInput}
              onChange={(e) => handleSearchChange(e.target.value)}
              className="pr-10"
              aria-label="Search members"
            />
            {searchInput && (
              <button
                onClick={handleClearSearch}
                className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
                aria-label="Clear search"
                type="button"
              >
                ✕
              </button>
            )}
          </div>
        </div>

        <select
          value={sort}
          onChange={(e) => onSortChange(e.target.value)}
          className="px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          aria-label="Sort members"
        >
          <option value="name">Name (A-Z)</option>
          <option value="-name">Name (Z-A)</option>
          <option value="-created_at">Newest First</option>
          <option value="created_at">Oldest First</option>
        </select>
      </div>
    </div>
  );
}
