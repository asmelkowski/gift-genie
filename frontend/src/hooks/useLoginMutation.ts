import { useMutation } from '@tanstack/react-query';
import api from '@/lib/api';
import { useAuthStore } from '@/hooks/useAuthStore';

interface LoginRequestDTO {
  email: string;
  password: string;
}

interface LoginResponseDTO {
  user: {
    id: string;
    email: string;
    name: string;
  };
  token_type: 'Bearer';
}

export const useLoginMutation = () => {
  const { login } = useAuthStore();

  return useMutation({
    mutationFn: async (data: LoginRequestDTO) => {
      const response = await api.post<LoginResponseDTO>('/api/v1/auth/login', data);
      return response;
    },
    onSuccess: (response) => {
       const { user } = response.data;
       const csrfToken = response.headers['x-csrf-token'] || '';
       login(user, csrfToken);
     },
    onError: (error: any) => {
      // Error handling will be done in the component
      console.error('Login error:', error);
    },
  });
};