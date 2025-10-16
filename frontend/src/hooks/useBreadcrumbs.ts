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
    const label = breadcrumbMap[path] || part.charAt(0).toUpperCase() + part.slice(1);
    return {
      label,
      path,
    };
  });

  return breadcrumbs;
}
