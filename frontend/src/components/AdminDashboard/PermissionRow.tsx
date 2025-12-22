import { useCallback } from 'react';
import { Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { type Permission } from '@/hooks/useUserPermissions';
import { parsePermissionCode } from '@/lib/permissionHelpers';

interface PermissionRowProps {
  permission: Permission;
  groupName?: string;
  onRevoke: () => void;
  isRevoking?: boolean;
}

export function PermissionRow({
  permission,
  groupName,
  onRevoke,
  isRevoking = false,
}: PermissionRowProps) {
  const parsed = parsePermissionCode(permission.code);

  // Format the badge text as resource:action (without UUID)
  const badgeText = `${parsed.resource}:${parsed.action}`;

  const handleRevoke = useCallback(() => {
    onRevoke();
  }, [onRevoke]);

  return (
    <div
      className="flex items-center justify-between gap-3 rounded-md bg-white p-3 hover:bg-gray-50 dark:bg-gray-800 dark:hover:bg-gray-750 transition-colors"
      data-testid={`user-permission-${permission.code}`}
    >
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 flex-wrap">
          <div className="inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200">
            {badgeText}
          </div>
          {groupName && (
            <span className="text-xs text-gray-600 dark:text-gray-400">({groupName})</span>
          )}
        </div>
        <div className="text-xs text-gray-600 dark:text-gray-400 mt-1">{permission.name}</div>
      </div>

      <Button
        size="sm"
        variant="ghost"
        onClick={handleRevoke}
        disabled={isRevoking}
        className="shrink-0 text-red-600 dark:text-red-400"
        aria-label={`Revoke ${permission.code}`}
        data-testid={`revoke-permission-${permission.code}`}
      >
        <Trash2 className="h-4 w-4" />
      </Button>
    </div>
  );
}
