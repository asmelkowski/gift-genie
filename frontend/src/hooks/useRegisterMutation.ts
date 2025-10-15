import { useMutation } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { AxiosError } from 'axios';
import toast from 'react-hot-toast';
import api from '@/lib/api';

interface RegisterRequestDTO {
  email: string;
  password: string;
  name: string;
}

interface UserCreatedResponseDTO {
  id: string;
  email: string;
  name: string;
  created_at: string;
}

export const useRegisterMutation = () => {
  const navigate = useNavigate();

  return useMutation({
    mutationFn: async (data: RegisterRequestDTO) => {
      const response = await api.post<UserCreatedResponseDTO>('/api/v1/auth/register', data);
      return response;
    },
    onSuccess: () => {
      toast.success('Account created successfully! Please log in.');
      navigate('/login');
    },
    onError: (error: AxiosError) => {
      // Error handling will be done in the component
      console.error('Register error:', error);
    },
  });
};