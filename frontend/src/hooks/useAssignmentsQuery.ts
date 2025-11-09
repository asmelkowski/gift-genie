import { useQuery } from '@tanstack/react-query';
import api from '@/lib/api';
import type { components } from '@/types/schema';

type ListAssignmentsResponse = components['schemas']['ListAssignmentsResponse'];

export const useAssignmentsQuery = (drawId: string) => {
  return useQuery({
    queryKey: ['assignments', drawId],
    queryFn: async () => {
      const response = await api.get<ListAssignmentsResponse>(`/draws/${drawId}/assignments`, {
        params: { include: 'names' },
      });
      return response.data;
    },
    enabled: !!drawId,
  });
};
