import { useSearchParams } from 'react-router-dom';
import { useCallback } from 'react';

interface GroupsQueryParams {
  search?: string;
  page?: number;
  page_size?: number;
  sort?: string;
}

export function useGroupsParams() {
  const [searchParams, setSearchParams] = useSearchParams();

  const params: GroupsQueryParams = {
    search: searchParams.get('search') || undefined,
    page: parseInt(searchParams.get('page') || '1', 10) || 1,
    page_size: parseInt(searchParams.get('page_size') || '12', 10) || 12,
    sort: searchParams.get('sort') || '-created_at',
  };

  const updateParams = useCallback(
    (updates: Partial<GroupsQueryParams>) => {
      const newParams = new URLSearchParams(searchParams);

      if (updates.search !== undefined) {
        if (updates.search) {
          newParams.set('search', updates.search);
        } else {
          newParams.delete('search');
        }
        newParams.set('page', '1');
      }

      if (updates.page !== undefined) {
        if (updates.page > 1) {
          newParams.set('page', updates.page.toString());
        } else {
          newParams.delete('page');
        }
      }

      if (updates.page_size !== undefined) {
        if (updates.page_size !== 12) {
          newParams.set('page_size', updates.page_size.toString());
        } else {
          newParams.delete('page_size');
        }
      }

      if (updates.sort !== undefined) {
        if (updates.sort !== '-created_at') {
          newParams.set('sort', updates.sort);
        } else {
          newParams.delete('sort');
        }
      }

      setSearchParams(newParams);
    },
    [searchParams, setSearchParams]
  );

  return { params, updateParams };
}
