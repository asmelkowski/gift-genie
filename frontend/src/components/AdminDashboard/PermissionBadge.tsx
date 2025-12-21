import type { Permission } from '@/hooks/useUserPermissions';

interface PermissionBadgeProps {
  permission: Permission;
  showTooltip?: boolean;
}

const categoryColors: Record<string, { bg: string; text: string }> = {
  groups: { bg: 'bg-blue-100', text: 'text-blue-800 dark:bg-blue-900 dark:text-blue-200' },
  members: { bg: 'bg-green-100', text: 'text-green-800 dark:bg-green-900 dark:text-green-200' },
  draws: { bg: 'bg-purple-100', text: 'text-purple-800 dark:bg-purple-900 dark:text-purple-200' },
  exclusions: {
    bg: 'bg-orange-100',
    text: 'text-orange-800 dark:bg-orange-900 dark:text-orange-200',
  },
  admin: { bg: 'bg-red-100', text: 'text-red-800 dark:bg-red-900 dark:text-red-200' },
};

export function PermissionBadge({
  permission,
  showTooltip = true,
}: PermissionBadgeProps) {
  const colors = categoryColors[permission.category] || categoryColors.groups;

  const badge = (
    <span
      className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold ${colors.bg} ${colors.text}`}
    >
      {permission.code}
    </span>
  );

  if (!showTooltip) {
    return badge;
  }

  return (
    <div className="group relative inline-block">
      {badge}
      <div className="absolute bottom-full left-1/2 mb-2 hidden -translate-x-1/2 transform rounded-md bg-gray-900 px-2 py-1 text-xs text-white shadow-lg group-hover:block whitespace-nowrap z-50">
        <div className="font-semibold">{permission.name}</div>
        <div className="text-gray-200">{permission.description}</div>
      </div>
    </div>
  );
}
