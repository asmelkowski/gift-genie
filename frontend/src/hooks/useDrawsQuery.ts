import { useQuery } from '@tanstack/react-query';
import api from '@/lib/api';
import type { components } from '@/types/schema';

type PaginatedDrawsResponse = components['schemas']['PaginatedDrawsResponse'];

interface UseDrawsQueryParams {
  groupId: string;
  status?: 'pending' | 'finalized';
  page?: number;
  page_size?: number;
  sort?: string;
}

export const useDrawsQuery = (params: UseDrawsQueryParams) => {
  return useQuery({
    queryKey: ['draws', params.groupId, params],
    queryFn: async () => {
      const response = await api.get<PaginatedDrawsResponse>(`/groups/${params.groupId}/draws`, {
        params: {
          status: params.status || undefined,
          page: params.page || 1,
          page_size: params.page_size || 10,
          sort: params.sort || '-created_at',
        },
      });
      return response.data;
    },
    staleTime: 15000,
  });
};
