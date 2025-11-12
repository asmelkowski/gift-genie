import { useQuery } from '@tanstack/react-query';
import api from '@/lib/api';
import type { components } from '@/types/schema';

type PaginatedGroupsResponse = components['schemas']['PaginatedGroupsResponse'];

interface UseGroupsQueryParams {
  search?: string;
  page?: number;
  page_size?: number;
  sort?: string;
}

export const useGroupsQuery = (params: UseGroupsQueryParams) => {
  return useQuery({
    queryKey: ['groups', params],
    queryFn: async () => {
      const response = await api.get<PaginatedGroupsResponse>('/groups', {
        params: {
          search: params.search || undefined,
          page: params.page || 1,
          page_size: params.page_size || 12,
          sort: params.sort || '-created_at',
        },
      });
      return response.data;
    },
    staleTime: 30000,
  });
};
