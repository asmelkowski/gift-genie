import { Link, useLocation } from 'react-router-dom';
import * as React from 'react';
import { useEffect } from 'react';
import type { NavigationItem } from './Sidebar';

interface MobileDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  items: NavigationItem[];
  activeRoute?: string;
}

export function MobileDrawer({ isOpen, onClose, items, activeRoute }: MobileDrawerProps) {
  const location = useLocation();
  const currentPath = activeRoute || location.pathname;

  const handleNavClick = () => {
    onClose();
  };

  const handleBackdropClick = (e: React.MouseEvent) => {
    if (e.target === e.currentTarget) {
      onClose();
    }
  };

  useEffect(() => {
    const handleEscKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };

    if (isOpen) {
      document.addEventListener('keydown', handleEscKey);
      document.body.style.overflow = 'hidden';
      return () => {
        document.removeEventListener('keydown', handleEscKey);
        document.body.style.overflow = 'unset';
      };
    }
  }, [isOpen, onClose]);

  return (
    <>
      {isOpen && (
        <div className="fixed inset-0 bg-black/50 z-40 lg:hidden" onClick={handleBackdropClick} />
      )}
      <nav
        className={`fixed inset-y-0 left-0 w-64 bg-sidebar border-r border-sidebar-border p-6 overflow-y-auto z-50 lg:hidden transform transition-transform duration-300 ease-in-out ${
          isOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        <ul className="space-y-2 list-none m-0 p-0">
          {items.map(item => {
            const isActive = currentPath === item.path || currentPath.startsWith(`${item.path}/`);

            return (
              <li key={item.path}>
                <Link
                  to={item.path}
                  onClick={handleNavClick}
                  className={`flex items-center gap-3 px-4 py-2 rounded-md transition-colors ${
                    isActive
                      ? 'bg-sidebar-accent text-sidebar-primary border-l-4 border-sidebar-primary font-semibold'
                      : 'text-sidebar-foreground hover:bg-sidebar-accent'
                  }`}
                >
                  <span>{item.label}</span>
                  {item.badge !== undefined && (
                    <span className="ml-auto inline-flex items-center justify-center w-6 h-6 text-xs font-semibold bg-red-500 text-white rounded-full">
                      {item.badge}
                    </span>
                  )}
                </Link>
              </li>
            );
          })}
        </ul>
      </nav>
    </>
  );
}
