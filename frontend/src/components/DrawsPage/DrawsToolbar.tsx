import { useTranslation } from 'react-i18next';
import { Label } from '@/components/ui/label';

interface DrawsToolbarProps {
  status: 'all' | 'pending' | 'finalized';
  onStatusChange: (status: 'all' | 'pending' | 'finalized') => void;
  sort: string;
  onSortChange: (sort: string) => void;
}

export default function DrawsToolbar({
  status,
  onStatusChange,
  sort,
  onSortChange,
}: DrawsToolbarProps) {
  const { t } = useTranslation('draws');

  const STATUS_OPTIONS = [
    { value: 'all', label: t('toolbar.status.all') },
    { value: 'pending', label: t('toolbar.status.pending') },
    { value: 'finalized', label: t('toolbar.status.finalized') },
  ];

  const SORT_OPTIONS = [
    { value: '-created_at', label: t('toolbar.sort.createdNewest') },
    { value: 'created_at', label: t('toolbar.sort.createdOldest') },
    { value: '-finalized_at', label: t('toolbar.sort.finalizedNewest') },
    { value: 'finalized_at', label: t('toolbar.sort.finalizedOldest') },
  ];

  return (
    <div className="flex flex-col sm:flex-row gap-4 mb-6">
      <div className="sm:w-48">
        <Label htmlFor="status" className="sr-only">
          {t('toolbar.filterLabel')}
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
          {t('toolbar.sortLabel')}
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
