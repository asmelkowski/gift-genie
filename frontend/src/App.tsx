import { createBrowserRouter, RouterProvider, Navigate } from 'react-router-dom';
import { QueryClientProvider } from '@tanstack/react-query';
import { useState, useEffect } from 'react';
import { Toaster } from 'react-hot-toast';
import { queryClient } from '@/lib/queryClient';
import { LoginPage } from '@/components/LoginPage';
import { RegisterPage } from '@/pages/RegisterPage';
import { HomePage } from '@/pages/HomePage';
import { GroupsPage } from '@/components/GroupsPage';
import { GroupDetails } from '@/components/GroupsPage/GroupDetails';
import { MembersPage } from '@/pages/MembersPage';
import { ProtectedRoute } from '@/components/ProtectedRoute';
import { AppLayout } from '@/components/AppLayout/AppLayout';
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
    path: '/app',
    element: (
      <ProtectedRoute>
        <AppLayout />
      </ProtectedRoute>
    ),
    children: [
       {
         path: 'groups',
         element: <GroupsPage />,
       },
       {
         path: 'groups/:groupId',
         element: <GroupDetails />,
       },
       {
         path: 'groups/:groupId/members',
         element: <MembersPage />,
       },
       {
         path: 'settings',
         element: <div>Settings Page (To be implemented)</div>,
       },
     ],
  },
]);

function AppContent() {
     const { login } = useAuthStore();
     const [isBootstrapped, setIsBootstrapped] = useState(false);

      useEffect(() => {
        const checkAuth = async () => {
          try {
            console.log('[Auth] Checking session...');
            const response = await api.get('/api/v1/auth/me');
            console.log('[Auth] Session valid, user:', response.data);
            login(response.data);
          } catch (error) {
            console.log('[Auth] Session check failed:', error);
          } finally {
            setIsBootstrapped(true);
          }
        };

        checkAuth();
      }, [login]);

     if (!isBootstrapped) {
       return (
         <div className="flex items-center justify-center h-screen bg-gray-50">
           <div className="text-center">
             <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mb-4"></div>
             <p className="text-gray-600">Loading...</p>
           </div>
         </div>
       );
     }

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
