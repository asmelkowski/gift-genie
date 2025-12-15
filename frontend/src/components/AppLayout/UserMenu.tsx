import { useRef, useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';

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
  const [isOpen, setIsOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);
  const navigate = useNavigate();

  const handleToggle = useCallback(() => {
    setIsOpen(prev => !prev);
  }, []);

  const handleSettings = useCallback(() => {
    navigate('/app/settings');
    setIsOpen(false);
  }, [navigate]);

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
        className="flex items-center justify-center w-10 h-10 rounded-full bg-blue-600 text-white font-semibold hover:bg-blue-700 focus:outline-2 focus:outline-blue-600 focus:outline-offset-2 transition-colors"
        data-testid="user-menu-button"
      >
        {getInitials(user.name)}
      </button>
      {isOpen && (
        <div
          role="menu"
          className="absolute top-full right-0 mt-2 w-52 bg-white border border-gray-200 rounded-md shadow-lg z-1000 opacity-100 transform translate-y-0 transition-all"
        >
          <div className="p-4 border-b border-gray-200">
            <div className="font-semibold text-foreground">{user.name}</div>
            <div className="text-sm text-gray-600">{user.email}</div>
          </div>
          <ul className="list-none m-0 p-0">
            <li>
              <button
                onClick={handleSettings}
                role="menuitem"
                className="block w-full text-left px-4 py-2 text-foreground hover:bg-gray-50 transition-colors"
              >
                Settings
              </button>
            </li>
            <li className="border-t border-gray-200">
              <button
                onClick={handleLogout}
                role="menuitem"
                className="block w-full text-left px-4 py-2 text-red-600 hover:bg-gray-50 transition-colors"
              >
                Logout
              </button>
            </li>
          </ul>
        </div>
      )}
    </div>
  );
}
