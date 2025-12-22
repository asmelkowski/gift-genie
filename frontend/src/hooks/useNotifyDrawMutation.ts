import { useMutation, useQueryClient } from '@tanstack/react-query';
import api from '@/lib/api';
import type { components } from '@/types/schema';
import type { AxiosError } from 'axios';
import toast from 'react-hot-toast';
import { getErrorMessage, isForbiddenError } from '@/lib/errors';

type NotifyDrawResponse = components['schemas']['NotifyDrawResponse'];

export const useNotifyDrawMutation = (groupId: string) => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (params: { drawId: string; resend: boolean }) => {
      const response = await api.post<NotifyDrawResponse>(
        `/groups/${groupId}/draws/${params.drawId}/notify`,
        {
          resend: params.resend,
        }
      );
      return response.data;
    },
    onSuccess: (data, variables) => {
      queryClient.invalidateQueries({ queryKey: ['draws', groupId] });
      queryClient.invalidateQueries({ queryKey: ['draw', variables.drawId] });
      return data;
    },
    onError: (error: AxiosError) => {
      // Show generic message for permission denied errors
      if (isForbiddenError(error)) {
        toast.error("You don't have permission to perform this action");
      } else {
        const message = getErrorMessage(error) || 'Failed to send notifications';
        toast.error(message);
      }
    },
  });
};
