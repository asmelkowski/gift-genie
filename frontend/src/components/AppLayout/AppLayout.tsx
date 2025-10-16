import { useCallback, useEffect } from 'react';
import { Outlet, useLocation } from 'react-router-dom';
import { queryClient } from '@/lib/queryClient';
import { useAuthStore } from '@/hooks/useAuthStore';
import { useAppLayout } from '@/hooks/useAppLayout';
import { Header } from './Header';
import { Sidebar } from './Sidebar';
import type { NavigationItem } from './Sidebar';
import { MobileDrawer } from './MobileDrawer';

const NAVIGATION_ITEMS: NavigationItem[] = [
  { label: 'Groups', path: '/app/groups' },
  { label: 'Settings', path: '/app/settings' },
];

export function AppLayout() {
  const location = useLocation();
  const user = useAuthStore((state) => state.user);
  const logout = useAuthStore((state) => state.logout);
  const { theme, sidebarOpen, toggleTheme, toggleSidebar, closeSidebar } = useAppLayout();

  const handleLogout = useCallback(() => {
    logout();
    queryClient.clear();
    // Force a complete page reload to clear all session state
    // This ensures the bootstrap query runs fresh without any cached auth
    window.location.reload();
  }, [logout]);

  const handleToggleSidebar = useCallback(() => {
    toggleSidebar();
  }, [toggleSidebar]);

  const handleToggleTheme = useCallback(() => {
    toggleTheme();
  }, [toggleTheme]);

  // Close sidebar when route changes
  useEffect(() => {
    closeSidebar();
  }, [location.pathname, closeSidebar]);

  if (!user) {
    return null;
  }

  return (
    <div className="flex flex-col h-screen">
      <Header
        onToggleSidebar={handleToggleSidebar}
        onLogout={handleLogout}
        theme={theme}
        onToggleTheme={handleToggleTheme}
      />
      <div className="flex flex-1 overflow-hidden">
        <Sidebar items={NAVIGATION_ITEMS} />
        <MobileDrawer
          isOpen={sidebarOpen}
          onClose={closeSidebar}
          items={NAVIGATION_ITEMS}
        />
        <main className="flex-1 overflow-y-auto p-6 bg-gray-50">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
