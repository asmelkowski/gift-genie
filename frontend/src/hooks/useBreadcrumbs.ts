import { useLocation } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useGroupDetailsQuery } from './useGroupDetailsQuery';

export interface BreadcrumbItem {
  label: string;
  path: string;
}

export function useBreadcrumbs(): BreadcrumbItem[] {
  const { t } = useTranslation('common');
  const location = useLocation();
  const parts = location.pathname.split('/').filter(Boolean);

  // Group ID is always the 2nd segment in /groups/:groupId/...
  const isGroupContext = parts[0] === 'groups';
  const groupId = isGroupContext ? parts[1] : undefined;
  const { data: group } = useGroupDetailsQuery(groupId || '');

  const breadcrumbMap: Record<string, string> = {
    '/groups': t('navigation.groups'),
    '/admin': t('navigation.admin'),
  };

  const breadcrumbs = parts.map((part, index) => {
    const path = '/' + parts.slice(0, index + 1).join('/');

    // Handle dynamic routes and specific mappings
    let label = breadcrumbMap[path];

    if (!label) {
      if (isGroupContext && index === 1 && group) {
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
