import { Button } from '@/components/ui/button';

interface PaginationControlsProps {
  page: number;
  totalPages: number;
  total: number;
  pageSize: number;
  onPageChange: (page: number) => void;
  isLoading?: boolean;
}

export function PaginationControls({
  page,
  totalPages,
  total,
  pageSize,
  onPageChange,
  isLoading = false,
}: PaginationControlsProps) {
  const startItem = (page - 1) * pageSize + 1;
  const endItem = Math.min(page * pageSize, total);

  return (
    <div className="flex flex-col sm:flex-row items-center justify-between gap-4 mt-6 pt-4 border-t">
      <div className="text-sm text-gray-600">
        Showing {startItem} to {endItem} of {total}
      </div>

      <div className="flex gap-2">
        <Button
          onClick={() => onPageChange(page - 1)}
          disabled={page === 1 || isLoading}
          variant="outline"
        >
          Previous
        </Button>

        <div className="flex items-center gap-2">
          {Array.from({ length: totalPages }).map((_, i) => {
            const pageNum = i + 1;
            const isCurrentPage = pageNum === page;
            const isNearby = Math.abs(pageNum - page) <= 2;

            if (!isNearby && pageNum !== 1 && pageNum !== totalPages) {
              return null;
            }

            if (!isNearby && pageNum !== 1 && pageNum !== totalPages - 1) {
              return (
                <span key={`ellipsis-${i}`} className="text-gray-400">
                  ...
                </span>
              );
            }

            return (
              <button
                key={pageNum}
                onClick={() => onPageChange(pageNum)}
                disabled={isLoading}
                className={`px-3 py-2 rounded text-sm font-medium transition-colors ${
                  isCurrentPage
                    ? 'bg-blue-600 text-white'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                {pageNum}
              </button>
            );
          })}
        </div>

        <Button
          onClick={() => onPageChange(page + 1)}
          disabled={page === totalPages || isLoading}
          variant="outline"
        >
          Next
        </Button>
      </div>
    </div>
  );
}
