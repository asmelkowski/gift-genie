import { useMutation, useQueryClient } from '@tanstack/react-query';
import api from '@/lib/api';
import type { components } from '@/types/schema';
import type { AxiosError } from 'axios';
import toast from 'react-hot-toast';

type DrawResponse = components['schemas']['DrawResponse'];

export const useCreateDrawMutation = (groupId: string) => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async () => {
      const response = await api.post<DrawResponse>(`/groups/${groupId}/draws`, {});
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['draws', groupId] });
      toast.success('Draw created successfully');
    },
    onError: (error: AxiosError<{ detail: string }>) => {
      const message = error.response?.data?.detail || 'Failed to create draw';
      toast.error(message);
    },
  });
};
