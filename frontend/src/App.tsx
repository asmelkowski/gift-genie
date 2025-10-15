import { createBrowserRouter, RouterProvider, Navigate } from 'react-router-dom';
import { QueryClientProvider } from '@tanstack/react-query';
import { useQuery } from '@tanstack/react-query';
import { useRef } from 'react';
import { Toaster } from 'react-hot-toast';
import { queryClient } from '@/lib/queryClient';
import { LoginPage } from '@/components/LoginPage';
import { RegisterPage } from '@/pages/RegisterPage';
import { HomePage } from '@/pages/HomePage';
import { GroupsPage } from '@/components/GroupsPage';
import { ProtectedRoute } from '@/components/ProtectedRoute';
import { useAuthStore } from '@/hooks/useAuthStore';
import api from '@/lib/api';
import './App.css'

function Home() {
  const { isAuthenticated } = useAuthStore();
  return <Navigate to={isAuthenticated() ? '/app/groups' : '/login'} replace />;
}

const router = createBrowserRouter([
  {
    path: '/',
    element: <Home />,
  },
  {
    path: '/login',
    element: <LoginPage />,
  },
  {
    path: '/register',
    element: <RegisterPage />,
  },
  {
    path: '/home',
    element: (
      <ProtectedRoute>
        <HomePage />
      </ProtectedRoute>
    ),
  },
  {
    path: '/app/groups',
    element: (
      <ProtectedRoute>
        <GroupsPage />
      </ProtectedRoute>
    ),
  },
]);

function AppContent() {
  const { login } = useAuthStore();
  const hasCheckedSession = useRef(false);

  // Session check on app load
  useQuery({
    queryKey: ['auth', 'me'],
    queryFn: async () => {
      const response = await api.get('/api/v1/auth/me');
      return { data: response.data, csrfToken: response.headers['x-csrf-token'] as string };
    },
    onSuccess: ({ data, csrfToken }) => {
      const { user } = data;
      login(user, csrfToken);
    },
    enabled: !hasCheckedSession.current,
    staleTime: Infinity, // Only run once on mount
    retry: false, // Don't retry on 401
    onSettled: () => {
      hasCheckedSession.current = true;
    },
  });

  return <RouterProvider router={router} />;
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <AppContent />
      <Toaster />
    </QueryClientProvider>
  );
}

export default App
