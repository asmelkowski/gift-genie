import axios from 'axios';
import toast from 'react-hot-toast';
import { queryClient } from './queryClient';
import { useAuthStore } from '@/hooks/useAuthStore';

const api = axios.create({
  baseURL: (() => {
    const baseUrl =
      import.meta.env.VITE_API_BASE_URL || import.meta.env.VITE_API_URL || 'http://localhost:8000';
    // Ensure baseURL includes /api/v1 prefix
    return baseUrl.endsWith('/api/v1') ? baseUrl : `${baseUrl}/api/v1`;
  })(),
  withCredentials: true,
  timeout: 30000,
});

// Request interceptor for logging and CSRF token handling
api.interceptors.request.use(config => {
  const state = useAuthStore.getState();
  if (
    state.csrfToken &&
    ['post', 'put', 'delete', 'patch'].includes(config.method?.toLowerCase() || '')
  ) {
    config.headers['X-CSRF-Token'] = state.csrfToken;
  }

  // Log outgoing requests in development mode
  if (import.meta.env.DEV) {
    console.log(`🚀 API Request: ${config.method?.toUpperCase()} ${config.url}`, {
      baseURL: config.baseURL,
      fullURL: `${config.baseURL}${config.url}`,
      headers: config.headers,
      data: config.data,
      params: config.params,
    });
  }

  return config;
});

// Response interceptor to handle errors with enhanced logging and connectivity issues
api.interceptors.response.use(
  response => {
    // Log successful responses in development mode
    if (import.meta.env.DEV) {
      console.log(
        `✅ API Response: ${response.config.method?.toUpperCase()} ${response.config.url}`,
        {
          status: response.status,
          statusText: response.statusText,
          data: response.data,
        }
      );
    }
    return response;
  },
  error => {
    const baseURL = api.defaults.baseURL;
    const requestURL = error.config?.url || 'unknown';
    const fullURL = `${baseURL}${requestURL}`;
    const method = error.config?.method?.toUpperCase() || 'UNKNOWN';

    // Log detailed error information in development mode
    if (import.meta.env.DEV) {
      console.error(`❌ API Error: ${method} ${requestURL}`, {
        fullURL,
        baseURL,
        method,
        status: error.response?.status,
        statusText: error.response?.statusText,
        message: error.message,
        code: error.code,
        config: error.config,
        response: error.response?.data,
      });
    }

    // Handle authentication errors
    if (error.response?.status === 401) {
      // Don't redirect if this is the initial auth check or login attempt
      const isBootstrapCall = error.config?.url === '/auth/me';
      const isLoginCall = error.config?.url === '/auth/login';

      queryClient.clear();
      useAuthStore.getState().logout();

      // Only show toast and redirect if not the bootstrap or login call
      if (!isBootstrapCall && !isLoginCall) {
        toast.error('Session expired. Please login again.');
        // Use setTimeout to allow current render to complete
        setTimeout(() => {
          window.location.href = '/login';
        }, 0);
      }
    }
    // Handle network connectivity issues
    else if (error.code === 'ERR_NETWORK' || !error.response) {
      const errorMessage = `Unable to connect to the server at ${baseURL}. Please check your internet connection and ensure the server is running.`;
      toast.error(errorMessage);

      if (import.meta.env.DEV) {
        console.error('Network connectivity issue detected:', {
          baseURL,
          fullURL,
          error: error.message,
          suggestion: 'Make sure the backend server is running and accessible',
        });
      }
    }
    // Handle CORS issues
    else if (error.message?.includes('CORS') || error.code === 'ERR_CORS') {
      const errorMessage = `CORS error connecting to ${baseURL}. The server may not be configured to accept requests from this origin.`;
      toast.error(errorMessage);

      if (import.meta.env.DEV) {
        console.error('CORS issue detected:', {
          baseURL,
          fullURL,
          error: error.message,
          suggestion: 'Check backend CORS configuration',
        });
      }
    }
    // Handle timeout errors
    else if (error.code === 'ECONNABORTED' || error.message?.includes('timeout')) {
      const errorMessage = `Request to ${baseURL} timed out. Please try again.`;
      toast.error(errorMessage);
    }
    // Handle server errors (5xx)
    else if (error.response?.status >= 500) {
      const errorMessage = `Server error (${error.response.status}). Please try again later.`;
      toast.error(errorMessage);
    }
    // Handle client errors (4xx except 401 which is handled above)
    else if (error.response?.status >= 400 && error.response?.status !== 401) {
      // Don't show toast for validation errors (422) as they're usually handled by forms
      if (error.response.status !== 422) {
        const errorMessage =
          error.response?.data?.detail ||
          error.response?.data?.message ||
          `Request failed (${error.response.status})`;
        toast.error(errorMessage);
      }
    }

    return Promise.reject(error);
  }
);

export const logout = async (): Promise<void> => {
  await api.post('/auth/logout');
};

export default api;
