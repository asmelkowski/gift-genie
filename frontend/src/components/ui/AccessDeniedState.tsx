import { useNavigate } from 'react-router-dom';
import { Button } from './button';

interface AccessDeniedStateProps {
  /**
   * Optional custom message to display
   */
  message?: string;
  /**
   * Optional callback for retry action
   */
  onRetry?: () => void;
  /**
   * Whether to show the back button (default: true)
   */
  showBackButton?: boolean;
}

/**
 * Displays a user-friendly access denied message for 403 errors.
 * Shows navigation options to go back or to home.
 */
export function AccessDeniedState({
  message = "You don't have permission to access or perform this action.",
  onRetry,
  showBackButton = true,
}: AccessDeniedStateProps) {
  const navigate = useNavigate();

  return (
    <div className="flex flex-col items-center justify-center py-12 px-4 text-center">
      <div className="max-w-md">
        {/* Lock icon */}
        <div className="inline-flex items-center justify-center w-20 h-20 rounded-full bg-amber-50 dark:bg-amber-900/20 mb-8 border-4 border-amber-100 dark:border-amber-900/40">
          <svg
            className="w-10 h-10 text-amber-600 dark:text-amber-500"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
            aria-hidden="true"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"
            />
          </svg>
        </div>

        <h2 className="text-2xl font-bold text-foreground mb-3">Access Denied</h2>
        <div className="space-y-4 mb-8">
          <p className="text-muted-foreground text-lg">{message}</p>
          <p className="text-sm text-muted-foreground/80 bg-muted/50 dark:bg-muted/10 p-3 rounded-lg border border-border/50">
            If you believe you should have access to this resource, please contact your system
            administrator.
          </p>
        </div>

        <div className="flex flex-col sm:flex-row gap-3 justify-center">
          {showBackButton && (
            <Button
              variant="outline"
              size="lg"
              onClick={() => navigate(-1)}
              className="min-w-[120px]"
            >
              Go Back
            </Button>
          )}
          <Button size="lg" onClick={() => navigate('/groups')} className="min-w-[120px]">
            Return to Groups
          </Button>
          {onRetry && (
            <Button variant="ghost" size="lg" onClick={onRetry} className="min-w-[120px]">
              Try Again
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}
