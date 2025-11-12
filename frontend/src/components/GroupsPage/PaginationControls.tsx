import { useCallback } from 'react';
import { Button } from '@/components/ui/button';
import type { components } from '@/types/schema';

type PaginationMeta = components['schemas']['PaginationMeta'];

interface PaginationControlsProps {
  meta: PaginationMeta;
  onPageChange: (page: number) => void;
}

export function PaginationControls({ meta, onPageChange }: PaginationControlsProps) {
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
        Page {meta.page} of {meta.total_pages} ({meta.total} total)
      </p>
      <div className="flex gap-2">
        <Button onClick={handlePrevious} disabled={meta.page === 1} variant="outline">
          Previous
        </Button>
        <Button onClick={handleNext} disabled={meta.page >= meta.total_pages} variant="outline">
          Next
        </Button>
      </div>
    </div>
  );
}
