import { useMutation, useQueryClient } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import api from '@/lib/api';
import type { components } from '@/types/schema';
import type { AxiosError } from 'axios';

type CreateMemberRequest = components['schemas']['CreateMemberRequest'];
type MemberResponse = components['schemas']['MemberResponse'];

export const useCreateMemberMutation = (
  groupId: string,
  onError?: (detail: string) => void
) => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: CreateMemberRequest) => {
      const response = await api.post<MemberResponse>(
        `/api/v1/groups/${groupId}/members`,
        data
      );
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['members', groupId] });
      toast.success('Member added successfully');
    },
    onError: (error: AxiosError<{ detail: string }>) => {
      const detail = error.response?.data?.detail || 'Failed to add member';
      if (onError) {
        onError(detail);
      } else {
        toast.error(detail);
      }
    },
  });
};
