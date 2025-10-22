import { useLocation } from 'react-router-dom';

export interface BreadcrumbItem {
  label: string;
  path: string;
}

export function useBreadcrumbs(): BreadcrumbItem[] {
  const location = useLocation();

  const breadcrumbMap: Record<string, string> = {
    '/app': 'Home',
    '/app/groups': 'Groups',
    '/app/settings': 'Settings',
    '/app/help': 'Help',
  };

  const parts = location.pathname.split('/').filter(Boolean);

  const breadcrumbs = parts.map((part, index) => {
    const path = '/' + parts.slice(0, index + 1).join('/');
    let label = breadcrumbMap[path] || part.charAt(0).toUpperCase() + part.slice(1);

    // Handle dynamic routes
    if (path.startsWith('/app/groups/') && parts[index] === 'groups') {
      // This is the groupId part
      const groupId = parts[index + 1];
      if (groupId) {
        // We'll need to fetch the group name here, but for now just show "Group"
        label = 'Group';
      }
    }

    return {
      label,
      path,
    };
  });

  return breadcrumbs;
}
