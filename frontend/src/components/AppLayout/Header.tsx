import { useCallback } from 'react';
import { useAuthStore } from '@/hooks/useAuthStore';
import { Breadcrumb } from './Breadcrumb';
import { UserMenu } from './UserMenu';
import { useBreadcrumbs } from '@/hooks/useBreadcrumbs';

interface HeaderProps {
  onToggleSidebar: () => void;
  onLogout: () => void;
  theme: 'light' | 'dark';
  onToggleTheme: () => void;
}

export function Header({
  onToggleSidebar,
  onLogout,
  theme,
  onToggleTheme,
}: HeaderProps) {
  const user = useAuthStore((state) => state.user);
  const breadcrumbs = useBreadcrumbs();

  const handleLogout = useCallback(() => {
    onLogout();
  }, [onLogout]);

  return (
    <header className="flex items-center justify-between gap-4 px-4 py-4 bg-white border-b border-gray-200 shadow-sm">
      <div className="flex items-center gap-4 flex-1">
        <div className="text-2xl font-bold text-blue-600 whitespace-nowrap">Gift Genie</div>
        <div className="flex-1 min-w-0">
          <Breadcrumb items={breadcrumbs} />
        </div>
      </div>
      <div className="flex items-center gap-3 whitespace-nowrap">
        <button
          onClick={onToggleTheme}
          aria-label={`Switch to ${theme === 'light' ? 'dark' : 'light'} theme`}
          title={`Switch to ${theme === 'light' ? 'dark' : 'light'} theme`}
          className="flex items-center justify-center w-10 h-10 border border-gray-200 rounded hover:bg-gray-50 focus:outline-2 focus:outline-blue-600 focus:outline-offset-2 transition-colors"
        >
          {theme === 'light' ? '🌙' : '☀️'}
        </button>
        <button
          onClick={onToggleSidebar}
          aria-label="Toggle navigation menu"
          title="Toggle navigation menu"
          className="lg:hidden flex items-center justify-center text-xl border border-gray-200 rounded px-2 py-2 hover:bg-gray-50 focus:outline-2 focus:outline-blue-600 focus:outline-offset-2 transition-colors"
        >
          ☰
        </button>
        <UserMenu user={user} onLogout={handleLogout} />
      </div>
    </header>
  );
}
