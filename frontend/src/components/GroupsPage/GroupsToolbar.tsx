import { useCallback, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Search, ListFilter } from 'lucide-react';

interface GroupsToolbarProps {
  search: string;
  sort: string;
  onSearchChange: (value: string) => void;
  onSortChange: (value: string) => void;
}

interface SortOption {
  value: string;
  label: string;
}

export function GroupsToolbar({ search, sort, onSearchChange, onSortChange }: GroupsToolbarProps) {
  const { t } = useTranslation('groups');
  const [inputValue, setInputValue] = useState(search);

  const SORT_OPTIONS: SortOption[] = useMemo(
    () => [
      { value: '-created_at', label: t('toolbar.sort.newestFirst') },
      { value: 'created_at', label: t('toolbar.sort.oldestFirst') },
      { value: 'name', label: t('toolbar.sort.nameAZ') },
      { value: '-name', label: t('toolbar.sort.nameZA') },
    ],
    [t]
  );

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

  const isValidSort = useMemo(
    () => SORT_OPTIONS.some(opt => opt.value === sort),
    [sort, SORT_OPTIONS]
  );

  return (
    <div className="flex flex-col sm:flex-row gap-4 mb-8">
      <div className="flex-1 relative group">
        <div className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground group-focus-within:text-primary transition-colors">
          <Search className="size-4" />
        </div>
        <Label htmlFor="search" className="sr-only">
          {t('toolbar.searchPlaceholder')}
        </Label>
        <Input
          id="search"
          type="text"
          placeholder={t('toolbar.searchPlaceholder')}
          value={inputValue}
          onChange={handleSearchChange}
          maxLength={100}
          className="pl-10 h-11 bg-card border-border/50 focus-visible:ring-primary shadow-sm rounded-xl"
        />
      </div>
      <div className="sm:w-56 relative group">
        <div className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground group-focus-within:text-primary transition-colors pointer-events-none">
          <ListFilter className="size-4" />
        </div>
        <Label htmlFor="sort" className="sr-only">
          {t('toolbar.sortLabel')}
        </Label>
        <select
          id="sort"
          value={isValidSort ? sort : '-created_at'}
          onChange={handleSortChange}
          className="w-full h-11 pl-10 pr-4 bg-card border border-border/50 rounded-xl shadow-sm focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent transition-all appearance-none text-sm font-medium cursor-pointer"
        >
          {SORT_OPTIONS.map(opt => (
            <option key={opt.value} value={opt.value}>
              {opt.label}
            </option>
          ))}
        </select>
        <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none text-muted-foreground">
          <svg
            className="size-4 fill-current"
            xmlns="http://www.w3.org/2000/svg"
            viewBox="0 0 20 20"
          >
            <path d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" />
          </svg>
        </div>
      </div>
    </div>
  );
}
