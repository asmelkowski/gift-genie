import { useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Loader2 } from 'lucide-react';
import { type Permission } from '@/hooks/useUserPermissions';
import { parsePermissionCode } from '@/lib/permissionHelpers';

interface AvailablePermissionRowProps {
  permission: Permission;
  groupName?: string;
  testId: string;
  onGrant: (code: string) => Promise<void>;
  isGranting?: boolean;
}

export function AvailablePermissionRow({
  permission,
  groupName,
  testId,
  onGrant,
  isGranting = false,
}: AvailablePermissionRowProps) {
  const parsed = parsePermissionCode(permission.code);

  // Format the badge text as resource:action (without UUID)
  const badgeText = `${parsed.resource}:${parsed.action}`;

  const handleGrant = useCallback(() => {
    onGrant(permission.code);
  }, [onGrant, permission.code]);

  return (
    <div
      className="flex items-center justify-between gap-3 rounded-md bg-white p-3 hover:bg-gray-50 dark:bg-gray-800 dark:hover:bg-gray-750 transition-colors"
      data-testid={testId}
    >
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 flex-wrap">
          <div className="inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold bg-emerald-100 text-emerald-800 dark:bg-emerald-900 dark:text-emerald-200">
            {badgeText}
          </div>
          {groupName && (
            <span className="text-xs text-gray-600 dark:text-gray-400">
              ({groupName})
            </span>
          )}
        </div>
        <div className="text-xs text-gray-600 dark:text-gray-400 mt-1">
          {permission.name}
        </div>
        {permission.description && (
          <div className="text-xs text-gray-500 dark:text-gray-500 mt-0.5">
            {permission.description}
          </div>
        )}
      </div>

      <Button
        size="sm"
        variant="default"
        onClick={handleGrant}
        disabled={isGranting}
        className="shrink-0"
        aria-label={`Grant ${permission.code}`}
        data-testid={`grant-permission-${permission.code}`}
      >
        {isGranting && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
        Grant
      </Button>
    </div>
  );
}
