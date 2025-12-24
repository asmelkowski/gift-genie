import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import api from '@/lib/api';
import type { components } from '@/types/schema';
import type { AxiosError } from 'axios';

type CreateGroupRequest = components['schemas']['CreateGroupRequest'];
type GroupDetailResponse = components['schemas']['GroupDetailResponse'];

export const useCreateGroupMutation = () => {
  const queryClient = useQueryClient();
  const navigate = useNavigate();

  return useMutation({
    mutationFn: async (data: CreateGroupRequest) => {
      const response = await api.post<GroupDetailResponse>('/groups', data);
      return response.data;
    },
    onSuccess: data => {
      queryClient.invalidateQueries({ queryKey: ['groups'] });
      toast.success('Group created successfully');
      navigate(`/groups/${data.id}/members`);
    },
    onError: (error: AxiosError<{ detail: string }>) => {
      const message = error.response?.data?.detail || 'Failed to create group';
      toast.error(message);
    },
  });
};
