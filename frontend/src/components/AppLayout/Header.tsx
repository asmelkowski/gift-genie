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

export function Header({ onToggleSidebar, onLogout, theme, onToggleTheme }: HeaderProps) {
  const user = useAuthStore(state => state.user);
  const breadcrumbs = useBreadcrumbs();

  const handleLogout = useCallback(() => {
    onLogout();
  }, [onLogout]);

  return (
    <header className="flex items-center justify-between gap-4 px-4 py-4 bg-background border-b border-border shadow-sm">
      <div className="flex items-center gap-4 flex-1">
        <div className="text-2xl font-serif font-bold text-primary whitespace-nowrap flex items-center gap-2">
          <span>🌲</span>
          Gift Genie
        </div>
        <div className="flex-1 min-w-0">
          <Breadcrumb items={breadcrumbs} />
        </div>
      </div>
      <div className="flex items-center gap-3 whitespace-nowrap">
        <button
          onClick={onToggleTheme}
          aria-label={`Switch to ${theme === 'light' ? 'dark' : 'light'} theme`}
          title={`Switch to ${theme === 'light' ? 'dark' : 'light'} theme`}
          className="flex items-center justify-center w-10 h-10 border border-border rounded hover:bg-muted focus:outline-2 focus:outline-ring focus:outline-offset-2 transition-colors text-foreground"
        >
          {theme === 'light' ? '🌙' : '☀️'}
        </button>
        <button
          onClick={onToggleSidebar}
          aria-label="Toggle navigation menu"
          title="Toggle navigation menu"
          className="lg:hidden flex items-center justify-center text-xl border border-border rounded px-2 py-2 hover:bg-muted focus:outline-2 focus:outline-ring focus:outline-offset-2 transition-colors text-foreground"
        >
          ☰
        </button>
        <UserMenu user={user} onLogout={handleLogout} />
      </div>
    </header>
  );
}
