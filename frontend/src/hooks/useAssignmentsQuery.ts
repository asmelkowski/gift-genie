import { useQuery } from '@tanstack/react-query';
import api from '@/lib/api';
import type { components } from '@/types/schema';

type ListAssignmentsResponse = components['schemas']['ListAssignmentsResponse'];

export const useAssignmentsQuery = (groupId: string, drawId: string) => {
  return useQuery({
    queryKey: ['assignments', drawId],
    queryFn: async () => {
      const response = await api.get<ListAssignmentsResponse>(
        `/groups/${groupId}/draws/${drawId}/assignments`,
        {
          params: { include: 'names' },
        }
      );
      return response.data;
    },
    enabled: !!groupId && !!drawId,
  });
};
