import { useTranslation } from 'react-i18next';
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
  const { t } = useTranslation('exclusions');

  const FILTER_OPTIONS = [
    { value: 'all' as const, label: t('toolbar.filter.all') },
    { value: 'manual' as const, label: t('toolbar.filter.manual') },
    { value: 'historical' as const, label: t('toolbar.filter.historical') },
  ];

  const SORT_OPTIONS = [
    { value: 'exclusion_type,name', label: t('toolbar.sort.typeAndName') },
    { value: '-created_at', label: t('toolbar.sort.newestFirst') },
    { value: 'created_at', label: t('toolbar.sort.oldestFirst') },
    { value: 'name', label: t('toolbar.sort.nameAZ') },
    { value: '-name', label: t('toolbar.sort.nameZA') },
  ];

  return (
    <div className="space-y-4 mb-6">
      <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
        <div className="flex gap-2">
          {FILTER_OPTIONS.map(option => (
            <button
              key={option.value}
              onClick={() => onFilterChange(option.value)}
              className={`px-3 py-2 rounded text-sm font-medium transition-colors ${
                filterType === option.value
                  ? 'bg-blue-100 text-blue-700'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              {option.label}
            </button>
          ))}
        </div>

        <Button
          onClick={onCreateClick}
          disabled={filterType === 'historical'}
          title={filterType === 'historical' ? t('toolbar.addDisabledTitle') : ''}
        >
          {t('toolbar.addButton')}
        </Button>
      </div>

      <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center">
        <div className="flex items-center gap-2">
          <label htmlFor="sort" className="text-sm font-medium text-gray-700">
            {t('toolbar.sortLabel')}:
          </label>
          <select
            id="sort"
            value={sortBy}
            onChange={e => onSortChange(e.target.value)}
            className="px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            {SORT_OPTIONS.map(opt => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </select>
        </div>
      </div>
    </div>
  );
}
