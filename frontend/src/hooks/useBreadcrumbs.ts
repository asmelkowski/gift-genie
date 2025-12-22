import { useLocation } from 'react-router-dom';
import { useGroupDetailsQuery } from './useGroupDetailsQuery';

export interface BreadcrumbItem {
  label: string;
  path: string;
}

export function useBreadcrumbs(): BreadcrumbItem[] {
  const location = useLocation();
  const parts = location.pathname.split('/').filter(Boolean);

  // Group ID is always the 3rd segment in /app/groups/:groupId/...
  const isGroupContext = parts[0] === 'app' && parts[1] === 'groups';
  const groupId = isGroupContext ? parts[2] : undefined;
  const { data: group } = useGroupDetailsQuery(groupId || '');

  const breadcrumbMap: Record<string, string> = {
    '/app': 'Home',
    '/app/groups': 'Groups',
    '/app/settings': 'Settings',
    '/app/help': 'Help',
    '/app/admin': 'Admin Dashboard',
  };

  const breadcrumbs = parts.map((part, index) => {
    const path = '/' + parts.slice(0, index + 1).join('/');

    // Handle dynamic routes and specific mappings
    let label = breadcrumbMap[path];

    if (!label) {
      if (isGroupContext && index === 2 && group) {
        label = group.name;
      } else {
        label = part.charAt(0).toUpperCase() + part.slice(1);
      }
    }

    return {
      label,
      path,
    };
  });

  return breadcrumbs;
}
