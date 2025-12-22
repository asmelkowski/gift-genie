import { useQuery } from '@tanstack/react-query';
import api from '@/lib/api';
import type { components } from '@/types/schema';

type DrawResponse = components['schemas']['DrawResponse'];

export const useDrawQuery = (groupId: string, drawId: string) => {
  return useQuery({
    queryKey: ['draw', drawId],
    queryFn: async () => {
      const response = await api.get<DrawResponse>(`/groups/${groupId}/draws/${drawId}`);
      return response.data;
    },
    enabled: !!groupId && !!drawId,
  });
};
