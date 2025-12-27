import { useTranslation } from 'react-i18next';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

interface AssignmentsToolbarProps {
  search: string;
  onSearchChange: (search: string) => void;
  sort: 'giver_asc' | 'giver_desc' | 'receiver_asc' | 'receiver_desc';
  onSortChange: (sort: string) => void;
}

export default function AssignmentsToolbar({
  search,
  onSearchChange,
  sort,
  onSortChange,
}: AssignmentsToolbarProps) {
  const { t } = useTranslation('draws');

  const SORT_OPTIONS = [
    { value: 'giver_asc', label: t('results.assignments.sort.giverAsc') },
    { value: 'giver_desc', label: t('results.assignments.sort.giverDesc') },
    { value: 'receiver_asc', label: t('results.assignments.sort.receiverAsc') },
    { value: 'receiver_desc', label: t('results.assignments.sort.receiverDesc') },
  ];

  return (
    <div className="flex flex-col sm:flex-row gap-4">
      <div className="flex-1">
        <Label htmlFor="search" className="sr-only">
          {t('results.assignments.searchPlaceholder')}
        </Label>
        <Input
          id="search"
          type="text"
          placeholder={t('results.assignments.searchPlaceholder')}
          value={search}
          onChange={e => onSearchChange(e.target.value)}
          maxLength={100}
        />
      </div>
      <div className="sm:w-48">
        <Label htmlFor="sort" className="sr-only">
          {t('results.assignments.sortLabel')}
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
