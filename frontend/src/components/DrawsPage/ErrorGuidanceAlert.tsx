import { useState } from 'react';
import { useTranslation } from 'react-i18next';
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
  const { t } = useTranslation('draws');
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
          return t('executeError.noValidConfigWithMinimum', { minimum: match[1] });
        }
      }

      return t('executeError.noValidConfig');
    }

    // Default guidance for unknown errors
    return t('executeError.unknownError');
  };

  const guidance = getGuidance();
  const showActionButtons =
    !error.includes('at least') || errorCode !== 'no_valid_draw_configuration';

  return (
    <div className="bg-accent/10 border border-accent/20 rounded-lg p-4 mb-4">
      <div className="flex gap-4">
        <AlertCircle className="w-5 h-5 text-accent flex-shrink-0 mt-0.5" />
        <div className="flex-1">
          <h3 className="font-semibold text-accent-foreground mb-1">{t('executeError.title')}</h3>
          <p className="text-sm text-muted-foreground mb-3">{guidance}</p>
          {showActionButtons && (
            <div className="flex flex-wrap gap-2">
              <Button
                size="sm"
                variant="outline"
                onClick={() => navigate(`/groups/${groupId}/exclusions`)}
                className="bg-background hover:bg-muted"
              >
                {t('executeError.reviewExclusionsButton')}
              </Button>
              <Button
                size="sm"
                variant="outline"
                onClick={() => navigate(`/groups/${groupId}/members`)}
                className="bg-background hover:bg-muted"
              >
                {t('executeError.addMembersButton')}
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
