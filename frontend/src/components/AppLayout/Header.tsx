import { useCallback } from 'react';
import { useTranslation } from 'react-i18next';
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
  const { t } = useTranslation('common');
  const user = useAuthStore(state => state.user);
  const breadcrumbs = useBreadcrumbs();

  const handleLogout = useCallback(() => {
    onLogout();
  }, [onLogout]);

  const themeLabel = theme === 'light' ? 'dark' : 'light';

  return (
    <header className="flex items-center justify-between gap-4 px-4 py-4 bg-background border-b border-border shadow-sm">
      <div className="flex items-center gap-4 flex-1">
        <div className="text-2xl font-serif font-bold text-primary whitespace-nowrap flex items-center gap-2">
          <span>🌲</span>
          {t('appLayout.title')}
        </div>
        <div className="flex-1 min-w-0">
          <Breadcrumb items={breadcrumbs} />
        </div>
      </div>
      <div className="flex items-center gap-3 whitespace-nowrap">
        <button
          onClick={onToggleTheme}
          aria-label={t('appLayout.toggleTheme', { theme: themeLabel })}
          title={t('appLayout.toggleTheme', { theme: themeLabel })}
          className="flex items-center justify-center w-10 h-10 border border-border rounded hover:bg-muted focus:outline-2 focus:outline-ring focus:outline-offset-2 transition-colors text-foreground"
        >
          {theme === 'light' ? '🌙' : '☀️'}
        </button>
        <button
          onClick={onToggleSidebar}
          aria-label={t('appLayout.toggleMenu')}
          title={t('appLayout.toggleMenu')}
          className="lg:hidden flex items-center justify-center text-xl border border-border rounded px-2 py-2 hover:bg-muted focus:outline-2 focus:outline-ring focus:outline-offset-2 transition-colors text-foreground"
        >
          ☰
        </button>
        <UserMenu user={user} onLogout={handleLogout} />
      </div>
    </header>
  );
}
