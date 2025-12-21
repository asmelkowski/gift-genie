import { useMutation, useQueryClient } from '@tanstack/react-query';
import api from '@/lib/api';
import toast from 'react-hot-toast';

interface GrantPermissionRequest {
  permission_code: string;
  notes?: string;
}

interface GrantPermissionResponse {
  user_id: string;
  permission_code: string;
  granted_at: string;
  granted_by: string | null;
}

export const useGrantPermission = (userId: string) => {
  const queryClient = useQueryClient();

  return useMutation<GrantPermissionResponse, Error, GrantPermissionRequest>({
    mutationFn: async (request) => {
      const { data } = await api.post(
        `/admin/users/${userId}/permissions`,
        request
      );
      return data;
    },
    onSuccess: () => {
      toast.success('Permission granted successfully');
      // Invalidate both user-specific and all permissions queries
      queryClient.invalidateQueries({
        queryKey: ['admin', 'users', userId, 'permissions'],
      });
    },
    onError: (error) => {
      const message =
        error instanceof Error ? error.message : 'Failed to grant permission';
      toast.error(message);
    },
  });
};
