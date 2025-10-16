import axios from 'axios';
import toast from 'react-hot-toast';
import { queryClient } from './queryClient';
import { useAuthStore } from '@/hooks/useAuthStore';

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || 'http://localhost:8000',
  withCredentials: true,
});

api.interceptors.request.use((config) => {
  const state = useAuthStore.getState();
  if (state.csrfToken && ['post', 'put', 'delete', 'patch'].includes(config.method?.toLowerCase() || '')) {
    config.headers['X-CSRF-Token'] = state.csrfToken;
  }
  return config;
});

// Response interceptor to handle 401 errors
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      // Don't redirect if this is the initial auth check
      const isBootstrapCall = error.config?.url === '/api/v1/auth/me';
      
      queryClient.clear();
      
      // Only show toast and redirect if not the bootstrap call
      if (!isBootstrapCall) {
        toast.error('Session expired. Please login again.');
        // Use setTimeout to allow current render to complete
        setTimeout(() => {
          window.location.href = '/login';
        }, 0);
      }
    }

    return Promise.reject(error);
  }
);

export default api;