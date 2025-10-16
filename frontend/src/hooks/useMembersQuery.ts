import { useQuery } from '@tanstack/react-query';
import api from '@/lib/api';
import type { components } from '@/types/schema';

type PaginatedMembersResponse = components['schemas']['PaginatedMembersResponse'];

interface UseMembersQueryParams {
  is_active?: boolean | null;
  search?: string;
  page?: number;
  page_size?: number;
  sort?: string;
}

export const useMembersQuery = (groupId: string, params: UseMembersQueryParams) => {
  return useQuery({
    queryKey: ['members', groupId, params],
    queryFn: async () => {
      const response = await api.get<PaginatedMembersResponse>(
        `/api/v1/groups/${groupId}/members`,
        {
          params: {
            is_active: params.is_active ?? undefined,
            search: params.search || undefined,
            page: params.page || 1,
            page_size: params.page_size || 12,
            sort: params.sort || 'name',
          },
        }
      );
      return response.data;
    },
    staleTime: 30000,
  });
};
