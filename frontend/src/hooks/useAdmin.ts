import { useQuery } from '@tanstack/react-query';
import api from '@/lib/api';
import type { components } from '@/types/schema';

type PaginatedUsersResponse = components['schemas']['PaginatedUsersResponse'];
type PaginatedGroupsResponse = components['schemas']['AdminPaginatedGroupsResponse'];

interface AdminQueryParams {
  page: number;
  pageSize: number;
  search: string;
}

export const useAdminUsers = ({ page, pageSize, search }: AdminQueryParams) => {
  return useQuery<PaginatedUsersResponse>({
    queryKey: ['admin', 'users', page, pageSize, search],
    queryFn: async () => {
      const { data } = await api.get('/admin/users', {
        params: { page, page_size: pageSize, search: search || undefined, sort: 'newest' },
      });
      return data;
    },
  });
};

export const useAdminGroups = ({ page, pageSize, search }: AdminQueryParams) => {
  return useQuery<PaginatedGroupsResponse>({
    queryKey: ['admin', 'groups', page, pageSize, search],
    queryFn: async () => {
      const { data } = await api.get('/admin/groups', {
        params: { page, page_size: pageSize, search: search || undefined, sort: '-created_at' },
      });
      return data;
    },
  });
};
