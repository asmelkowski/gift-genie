import { useRef, useState, useEffect, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { LanguageSwitcher } from '@/components/LanguageSwitcher';

interface UserViewModel {
  id: string;
  email: string;
  name: string;
}

interface UserMenuProps {
  user: UserViewModel | null;
  onLogout: () => void;
}

function getInitials(name: string): string {
  return name
    .split(' ')
    .slice(0, 2)
    .map(part => part[0])
    .join('')
    .toUpperCase();
}

export function UserMenu({ user, onLogout }: UserMenuProps) {
  const { t } = useTranslation('common');
  const [isOpen, setIsOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  const handleToggle = useCallback(() => {
    setIsOpen(prev => !prev);
  }, []);

  const handleLogout = useCallback(() => {
    onLogout();
    setIsOpen(false);
  }, [onLogout]);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }

    function handleEscKey(event: KeyboardEvent) {
      if (event.key === 'Escape') {
        setIsOpen(false);
      }
    }

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      document.addEventListener('keydown', handleEscKey);
      return () => {
        document.removeEventListener('mousedown', handleClickOutside);
        document.removeEventListener('keydown', handleEscKey);
      };
    }
  }, [isOpen]);

  if (!user) {
    return null;
  }

  return (
    <div className="relative" ref={menuRef}>
      <button
        onClick={handleToggle}
        aria-haspopup="menu"
        aria-expanded={isOpen}
        className="flex items-center justify-center w-10 h-10 rounded-full bg-primary text-primary-foreground font-semibold hover:opacity-90 focus:outline-2 focus:outline-primary focus:outline-offset-2 transition-colors"
        data-testid="user-menu-button"
      >
        {getInitials(user.name)}
      </button>
      {isOpen && (
        <div
          role="menu"
          className="absolute top-full right-0 mt-2 w-52 bg-card border border-border rounded-md shadow-lg z-50 opacity-100 transform translate-y-0 transition-all"
        >
          <div className="p-4 border-b border-border">
            <div className="font-semibold text-foreground">{user.name}</div>
            <div className="text-sm text-muted-foreground">{user.email}</div>
          </div>
          <ul className="list-none m-0 p-0">
            <li className="border-t border-border px-4 py-2">
              <LanguageSwitcher />
            </li>
            <li className="border-t border-border">
              <button
                onClick={handleLogout}
                role="menuitem"
                className="block w-full text-left px-4 py-2 text-destructive hover:bg-muted transition-colors"
              >
                {t('appLayout.logout')}
              </button>
            </li>
          </ul>
        </div>
      )}
    </div>
  );
}
