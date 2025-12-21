import { useQuery } from '@tanstack/react-query';
import api from '@/lib/api';

export interface Permission {
  code: string;
  name: string;
  description: string;
  category: string;
  created_at: string;
}

export const useUserPermissions = (userId: string) => {
  return useQuery<Permission[]>({
    queryKey: ['admin', 'users', userId, 'permissions'],
    queryFn: async () => {
      const { data } = await api.get(`/admin/users/${userId}/permissions`);
      return data;
    },
    enabled: !!userId,
  });
};
