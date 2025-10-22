import { useQuery } from '@tanstack/react-query';
import api from '@/lib/api';
import type { components } from '@/types/schema';

type DrawResponse = components['schemas']['DrawResponse'];

export const useDrawQuery = (drawId: string) => {
  return useQuery({
    queryKey: ['draw', drawId],
    queryFn: async () => {
      const response = await api.get<DrawResponse>(`/api/v1/draws/${drawId}`);
      return response.data;
    },
    enabled: !!drawId,
  });
};
