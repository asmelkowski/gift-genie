import { useQuery } from '@tanstack/react-query';
import api from '@/lib/api';
import type { components } from '@/types/schema';

type GroupDetailWithStatsResponse = components['schemas']['GroupDetailWithStatsResponse'];

export const useGroupDetailsQuery = (groupId: string) => {
  return useQuery({
    queryKey: ['group', groupId],
    queryFn: async () => {
      const response = await api.get<GroupDetailWithStatsResponse>(`/groups/${groupId}`);
      return response.data;
    },
    staleTime: 60000,
    enabled: !!groupId,
  });
};
