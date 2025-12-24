import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import api from '@/lib/api';
import type { components } from '@/types/schema';
import type { AxiosError } from 'axios';
import toast from 'react-hot-toast';

type DrawResponse = components['schemas']['DrawResponse'];

export const useFinalizeDrawMutation = (groupId: string) => {
  const queryClient = useQueryClient();
  const navigate = useNavigate();

  return useMutation({
    mutationFn: async (drawId: string) => {
      const response = await api.post<DrawResponse>(
        `/groups/${groupId}/draws/${drawId}/finalize`,
        {}
      );
      return response.data;
    },
    onSuccess: data => {
      queryClient.invalidateQueries({ queryKey: ['draws', groupId] });
      queryClient.setQueryData(['draw', data.id], data);

      sessionStorage.setItem(`draw-${data.id}-just-finalized`, 'true');

      toast.success('Draw finalized successfully!');
      navigate(`/groups/${groupId}/draws/${data.id}/results`);
    },
    onError: (error: AxiosError<{ detail: string }>) => {
      const message = error.response?.data?.detail || 'Failed to finalize draw';
      toast.error(message);
    },
  });
};
