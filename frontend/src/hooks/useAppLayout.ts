import { useState, useCallback } from 'react';

export function useAppLayout() {
  const [theme, setTheme] = useState<'light' | 'dark'>(() => {
    try {
      return (localStorage.getItem('app-theme') as 'light' | 'dark') || 'light';
    } catch {
      return 'light';
    }
  });

  const [sidebarOpen, setSidebarOpen] = useState(false);

  const toggleTheme = useCallback(() => {
    setTheme(prev => {
      const newTheme = prev === 'light' ? 'dark' : 'light';
      try {
        localStorage.setItem('app-theme', newTheme);
      } catch {
        // Silently fail if localStorage is not available
      }
      return newTheme;
    });
  }, []);

  const toggleSidebar = useCallback(() => {
    setSidebarOpen(prev => !prev);
  }, []);

  const closeSidebar = useCallback(() => {
    setSidebarOpen(false);
  }, []);

  return {
    theme,
    sidebarOpen,
    toggleTheme,
    toggleSidebar,
    closeSidebar,
  };
}
