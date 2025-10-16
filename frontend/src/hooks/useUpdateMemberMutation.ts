import { useMutation, useQueryClient } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import api from '@/lib/api';
import type { components } from '@/types/schema';
import type { AxiosError } from 'axios';

type UpdateMemberRequest = components['schemas']['UpdateMemberRequest'];
type MemberResponse = components['schemas']['MemberResponse'];

export const useUpdateMemberMutation = (
  groupId: string,
  onError?: (detail: string) => void
) => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: { memberId: string; payload: UpdateMemberRequest }) => {
      const response = await api.patch<MemberResponse>(
        `/api/v1/groups/${groupId}/members/${data.memberId}`,
        data.payload
      );
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['members', groupId] });
      toast.success('Member updated successfully');
    },
    onError: (error: AxiosError<{ detail: string }>) => {
      const detail = error.response?.data?.detail || 'Failed to update member';
      if (onError) {
        onError(detail);
      } else {
        toast.error(detail);
      }
    },
  });
};
