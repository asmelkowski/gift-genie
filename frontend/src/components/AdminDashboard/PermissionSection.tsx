import { cn } from '@/lib/utils';

interface PermissionSectionProps {
  title: string;
  count: number;
  icon?: string;
  children: React.ReactNode;
}

export function PermissionSection({
  title,
  count,
  icon,
  children,
}: PermissionSectionProps) {
  const permissionText = count === 1 ? 'permission' : 'permissions';

  return (
    <div className="rounded-lg border border-gray-200 dark:border-gray-700 overflow-hidden bg-white dark:bg-gray-800">
      {/* Header */}
      <div className="flex items-center justify-between gap-3 px-4 py-3 border-b border-gray-200 dark:border-gray-700">
        <div className="flex items-center gap-2 min-w-0">
          {icon && <span className="text-base flex-shrink-0">{icon}</span>}
          <h3 className="text-sm font-semibold text-gray-900 dark:text-gray-100 truncate">
            {title}
          </h3>
        </div>
        <span
          className={cn(
            'text-xs font-medium flex-shrink-0 px-2 py-1 rounded-full',
            'bg-gray-100 dark:bg-gray-700',
            'text-gray-700 dark:text-gray-300'
          )}
        >
          {count} {permissionText}
        </span>
      </div>

      {/* Content */}
      <div className="space-y-1 p-3">{children}</div>
    </div>
  );
}
