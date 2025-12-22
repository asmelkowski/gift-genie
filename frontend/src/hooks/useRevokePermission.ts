import { useMutation, useQueryClient } from '@tanstack/react-query';
import api from '@/lib/api';
import toast from 'react-hot-toast';

export const useRevokePermission = (userId: string) => {
  const queryClient = useQueryClient();

  return useMutation<void, Error, string>({
    mutationFn: async permissionCode => {
      await api.delete(`/admin/users/${userId}/permissions/${permissionCode}`);
    },
    onSuccess: () => {
      toast.success('Permission revoked successfully');
      // Invalidate user permissions query
      queryClient.invalidateQueries({
        queryKey: ['admin', 'users', userId, 'permissions'],
      });
    },
    onError: error => {
      const message = error instanceof Error ? error.message : 'Failed to revoke permission';
      toast.error(message);
    },
  });
};
