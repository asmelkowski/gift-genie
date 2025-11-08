import { useMutation, useQueryClient } from '@tanstack/react-query';
import api from '@/lib/api';
import type { components } from '@/types/schema';
import type { AxiosError } from 'axios';
import toast from 'react-hot-toast';

type NotifyDrawResponse = components['schemas']['NotifyDrawResponse'];

export const useNotifyDrawMutation = (groupId: string) => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (params: { drawId: string; resend: boolean }) => {
      const response = await api.post<NotifyDrawResponse>(`/api/v1/draws/${params.drawId}/notify`, {
        resend: params.resend,
      });
      return response.data;
    },
    onSuccess: (data, variables) => {
      queryClient.invalidateQueries({ queryKey: ['draws', groupId] });
      queryClient.invalidateQueries({ queryKey: ['draw', variables.drawId] });
      return data;
    },
    onError: (error: AxiosError<{ detail: string }>) => {
      const message = error.response?.data?.detail || 'Failed to send notifications';
      toast.error(message);
    },
  });
};
