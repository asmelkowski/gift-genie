import { useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { useAuthStore } from '@/hooks/useAuthStore';
import { Breadcrumb } from './Breadcrumb';
import { UserMenu } from './UserMenu';
import { useBreadcrumbs } from '@/hooks/useBreadcrumbs';
import { TreePine, Moon, Sun, Menu } from 'lucide-react';

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
    <header className="flex items-center justify-between gap-2 sm:gap-4 px-4 sm:px-6 py-3 bg-background/80 backdrop-blur-md border-b border-border sticky top-0 z-50">
      <div className="flex items-center gap-4 flex-1 min-w-0">
        <div className="flex items-center gap-2 shrink-0">
          <div className="bg-primary/10 p-1.5 rounded-lg">
            <TreePine className="size-6 text-primary" />
          </div>
          <span className="hidden sm:inline text-xl font-serif font-bold text-foreground tracking-tight">
            {t('appLayout.title')}
          </span>
        </div>
        <div className="flex-1 min-w-0 hidden md:block border-l pl-4 ml-2">
          <Breadcrumb items={breadcrumbs} />
        </div>
      </div>
      <div className="flex items-center gap-2 sm:gap-4 shrink-0">
        <button
          onClick={onToggleTheme}
          aria-label={t('appLayout.toggleTheme', { theme: themeLabel })}
          title={t('appLayout.toggleTheme', { theme: themeLabel })}
          className="flex items-center justify-center w-9 h-9 border border-border rounded-full hover:bg-muted focus:ring-2 focus:ring-ring focus:ring-offset-2 transition-all text-foreground bg-card shadow-sm"
        >
          {theme === 'light' ? <Moon className="size-4" /> : <Sun className="size-4" />}
        </button>
        <button
          onClick={onToggleSidebar}
          aria-label={t('appLayout.toggleMenu')}
          title={t('appLayout.toggleMenu')}
          className="lg:hidden flex items-center justify-center w-9 h-9 border border-border rounded-lg hover:bg-muted focus:ring-2 focus:ring-ring focus:ring-offset-2 transition-all text-foreground"
        >
          <Menu className="size-5" />
        </button>
        <div className="h-8 w-px bg-border mx-1 hidden sm:block" />
        <UserMenu user={user} onLogout={handleLogout} />
      </div>
    </header>
  );
}
