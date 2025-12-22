import { useMutation, useQueryClient } from '@tanstack/react-query';
import api from '@/lib/api';
import type { AxiosError } from 'axios';
import toast from 'react-hot-toast';

export const useDeleteDrawMutation = (groupId: string) => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (drawId: string) => {
      await api.delete(`/groups/${groupId}/draws/${drawId}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['draws', groupId] });
      toast.success('Draw deleted successfully');
    },
    onError: (error: AxiosError<{ detail: string }>) => {
      const message = error.response?.data?.detail || 'Failed to delete draw';
      toast.error(message);
    },
  });
};
