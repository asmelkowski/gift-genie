import { useMutation } from '@tanstack/react-query';
import { logout as logoutApi } from '@/lib/api';
import { useAuthStore } from '@/hooks/useAuthStore';
import { queryClient } from '@/lib/queryClient';
import { useNavigate } from 'react-router-dom';

export const useLogoutMutation = () => {
  const { logout: logoutStore } = useAuthStore();
  const navigate = useNavigate();

  return useMutation({
    mutationFn: logoutApi,
    onSuccess: () => {
      logoutStore();
      queryClient.clear();
      navigate('/login');
    },
    onError: () => {
      logoutStore();
      queryClient.clear();
      navigate('/login');
    },
  });
};
