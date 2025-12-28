import { useCallback, useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
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
  const { t } = useTranslation('members');
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
      <div className="flex flex-col gap-4">
        <div className="flex flex-wrap gap-2" role="group" aria-label={t('toolbar.filterLabel')}>
          <Button
            variant={isActive === null ? 'default' : 'outline'}
            onClick={() => onActiveFilterChange(null)}
            aria-pressed={isActive === null}
          >
            {t('toolbar.filterAll')}
          </Button>
          <Button
            variant={isActive === true ? 'default' : 'outline'}
            onClick={() => onActiveFilterChange(true)}
            aria-pressed={isActive === true}
          >
            {t('toolbar.filterActive')}
          </Button>
          <Button
            variant={isActive === false ? 'default' : 'outline'}
            onClick={() => onActiveFilterChange(false)}
            aria-pressed={isActive === false}
          >
            {t('toolbar.filterInactive')}
          </Button>
        </div>

        <div className="flex-1">
          <div className="relative">
            <Input
              placeholder={t('toolbar.searchPlaceholder')}
              value={searchInput}
              onChange={e => handleSearchChange(e.target.value)}
              className="pr-10"
              aria-label={t('toolbar.searchAriaLabel')}
            />
            {searchInput && (
              <button
                onClick={handleClearSearch}
                className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
                aria-label={t('toolbar.clearSearchAriaLabel')}
                type="button"
              >
                ✕
              </button>
            )}
          </div>
        </div>

        <select
          value={sort}
          onChange={e => onSortChange(e.target.value)}
          className="w-full sm:w-auto px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          aria-label={t('toolbar.sortLabel')}
        >
          <option value="name">{t('toolbar.sort.nameAZ')}</option>
          <option value="-name">{t('toolbar.sort.nameZA')}</option>
          <option value="-created_at">{t('toolbar.sort.newestFirst')}</option>
          <option value="created_at">{t('toolbar.sort.oldestFirst')}</option>
        </select>
      </div>
    </div>
  );
}
