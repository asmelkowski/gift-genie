import { useQuery } from '@tanstack/react-query';
import api from '@/lib/api';
import type { Permission } from './useUserPermissions';

export const useAvailablePermissions = () => {
  return useQuery<Permission[]>({
    queryKey: ['admin', 'permissions'],
    queryFn: async () => {
      const { data } = await api.get('/admin/permissions');
      return data;
    },
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
};
