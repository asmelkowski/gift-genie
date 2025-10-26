import { Alert } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';

interface ErrorStateProps {
  error: Error;
  onRetry: () => void;
}

export function ErrorState({ error, onRetry }: ErrorStateProps) {
  return (
    <div className="space-y-4" data-testid="error-state">
      <Alert variant="destructive" className="border-red-200 bg-red-50">
        <div className="font-semibold">Error loading groups</div>
        <div className="text-sm text-red-700 mt-1">
          {error.message || 'Failed to load your groups. Please try again.'}
        </div>
      </Alert>
       <Button onClick={onRetry} variant="outline" data-testid="retry-button">
         Retry
       </Button>
    </div>
  );
}
