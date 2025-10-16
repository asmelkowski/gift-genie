import { Button } from '@/components/ui/button';

interface ExclusionsToolbarProps {
  onCreateClick: () => void;
  filterType: 'all' | 'manual' | 'historical';
  onFilterChange: (type: 'all' | 'manual' | 'historical') => void;
  sortBy: string;
  onSortChange: (sort: string) => void;
}

export function ExclusionsToolbar({
  onCreateClick,
  filterType,
  onFilterChange,
  sortBy,
  onSortChange,
}: ExclusionsToolbarProps) {
  return (
    <div className="space-y-4 mb-6">
      <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
        <div className="flex gap-2">
          <button
            onClick={() => onFilterChange('all')}
            className={`px-3 py-2 rounded text-sm font-medium transition-colors ${
              filterType === 'all'
                ? 'bg-blue-100 text-blue-700'
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
            All
          </button>
          <button
            onClick={() => onFilterChange('manual')}
            className={`px-3 py-2 rounded text-sm font-medium transition-colors ${
              filterType === 'manual'
                ? 'bg-blue-100 text-blue-700'
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
            Manual
          </button>
          <button
            onClick={() => onFilterChange('historical')}
            className={`px-3 py-2 rounded text-sm font-medium transition-colors ${
              filterType === 'historical'
                ? 'bg-blue-100 text-blue-700'
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
            Historical
          </button>
        </div>

        <Button
          onClick={onCreateClick}
          disabled={filterType === 'historical'}
          title={filterType === 'historical' ? 'Cannot create historical exclusions' : ''}
        >
          Add Exclusion
        </Button>
      </div>

      <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center">
        <div className="flex items-center gap-2">
          <label htmlFor="sort" className="text-sm font-medium text-gray-700">
            Sort by:
          </label>
          <select
            id="sort"
            value={sortBy}
            onChange={(e) => onSortChange(e.target.value)}
            className="px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="exclusion_type,name">Type & Name</option>
            <option value="-created_at">Newest First</option>
            <option value="created_at">Oldest First</option>
            <option value="name">Giver Name (A-Z)</option>
            <option value="-name">Giver Name (Z-A)</option>
          </select>
        </div>
      </div>
    </div>
  );
}
