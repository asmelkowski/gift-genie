import { useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { Button } from '@/components/ui/button';
import type { components } from '@/types/schema';

type PaginationMeta = components['schemas']['PaginationMeta'];

interface PaginationControlsProps {
  meta: PaginationMeta;
  onPageChange: (page: number) => void;
}

export function PaginationControls({ meta, onPageChange }: PaginationControlsProps) {
  const { t } = useTranslation('common');
  const handlePrevious = useCallback(() => {
    if (meta.page > 1) {
      onPageChange(meta.page - 1);
    }
  }, [meta.page, onPageChange]);

  const handleNext = useCallback(() => {
    if (meta.page < meta.total_pages) {
      onPageChange(meta.page + 1);
    }
  }, [meta.page, meta.total_pages, onPageChange]);

  return (
    <div className="flex items-center justify-between mt-6 pt-6 border-t border-gray-200">
      <p className="text-sm text-gray-600">
        {t('pagination.page', {
          current: meta.page,
          total_pages: meta.total_pages,
          total: meta.total,
        })}
      </p>
      <div className="flex gap-2">
        <Button onClick={handlePrevious} disabled={meta.page === 1} variant="outline">
          {t('pagination.previous')}
        </Button>
        <Button onClick={handleNext} disabled={meta.page >= meta.total_pages} variant="outline">
          {t('pagination.next')}
        </Button>
      </div>
    </div>
  );
}
