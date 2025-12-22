import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { AlertCircle, X } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface ErrorGuidanceAlertProps {
  error: string;
  errorCode?: string;
  groupId: string;
}

/**
 * Provides guided error messages for draw execution failures
 * Shows context-specific guidance based on error code
 */
export default function ErrorGuidanceAlert({ error, errorCode, groupId }: ErrorGuidanceAlertProps) {
  const [dismissed, setDismissed] = useState(false);
  const navigate = useNavigate();

  if (dismissed) {
    return null;
  }

  // Extract specific guidance based on error code and message
  const getGuidance = () => {
    if (errorCode === 'no_valid_draw_configuration') {
      // Check the error message for more specific guidance
      if (error.includes('at least')) {
        // Message mentions a minimum number requirement
        const match = error.match(/at least (\d+)/);
        if (match) {
          return `You need at least ${match[1]} active members to execute this draw. Try adding more members to your group.`;
        }
      }

      return 'The current group configuration makes it impossible to assign everyone. This usually happens when: constraints eliminate too many valid pairs, you have too many exclusions, or not enough active members.';
    }

    // Default guidance for unknown errors
    return 'This usually means there are too many exclusions or not enough members. Try:';
  };

  const guidance = getGuidance();
  const showActionButtons =
    !error.includes('at least') || errorCode !== 'no_valid_draw_configuration';

  return (
    <div className="bg-accent/10 border border-accent/20 rounded-lg p-4 mb-4">
      <div className="flex gap-4">
        <AlertCircle className="w-5 h-5 text-accent flex-shrink-0 mt-0.5" />
        <div className="flex-1">
          <h3 className="font-semibold text-accent-foreground mb-1">Unable to Execute Draw</h3>
          <p className="text-sm text-muted-foreground mb-3">{guidance}</p>
          {showActionButtons && (
            <div className="flex flex-wrap gap-2">
              <Button
                size="sm"
                variant="outline"
                onClick={() => navigate(`/app/groups/${groupId}/exclusions`)}
                className="bg-background hover:bg-muted"
              >
                Review Exclusions
              </Button>
              <Button
                size="sm"
                variant="outline"
                onClick={() => navigate(`/app/groups/${groupId}/members`)}
                className="bg-background hover:bg-muted"
              >
                Add Members
              </Button>
            </div>
          )}
        </div>
        <button
          onClick={() => setDismissed(true)}
          className="text-muted-foreground hover:text-foreground transition-colors"
          aria-label="Dismiss error"
        >
          <X className="w-5 h-5" />
        </button>
      </div>
    </div>
  );
}
