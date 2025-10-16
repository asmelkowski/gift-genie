import { useQuery } from '@tanstack/react-query';
import api from '@/lib/api';
import type { components } from '@/types/schema';

type PaginatedExclusionsResponse =
  components['schemas']['PaginatedExclusionsResponse'];
type ExclusionType = components['schemas']['ExclusionType'];

interface UseExclusionsQueryParams {
  groupId: string;
  type?: ExclusionType;
  giver_member_id?: string;
  receiver_member_id?: string;
  page?: number;
  page_size?: number;
  sort?: string;
}

export const useExclusionsQuery = (params: UseExclusionsQueryParams) => {
  return useQuery({
    queryKey: ['exclusions', params.groupId, params],
    queryFn: async () => {
      const response = await api.get<PaginatedExclusionsResponse>(
        `/api/v1/groups/${params.groupId}/exclusions`,
        {
          params: {
            type: params.type || undefined,
            giver_member_id: params.giver_member_id || undefined,
            receiver_member_id: params.receiver_member_id || undefined,
            page: params.page || 1,
            page_size: params.page_size || 10,
            sort: params.sort || 'exclusion_type,name',
          },
        }
      );
      return response.data;
    },
    staleTime: 30000,
  });
};
