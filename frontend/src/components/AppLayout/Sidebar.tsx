import { Link, useLocation } from 'react-router-dom';

export interface NavigationItem {
  label: string;
  path: string;
  icon?: string;
  badge?: number;
}

interface SidebarProps {
  items: NavigationItem[];
  activeRoute?: string;
}

export function Sidebar({ items, activeRoute }: SidebarProps) {
  const location = useLocation();
  const currentPath = activeRoute || location.pathname;

  return (
    <nav className="hidden lg:flex lg:flex-col w-64 bg-sidebar border-r border-sidebar-border p-6 overflow-y-auto flex-shrink-0">
      <ul className="space-y-2 list-none m-0 p-0">
        {items.map(item => {
          const isActive = currentPath === item.path || currentPath.startsWith(`${item.path}/`);

          return (
            <li key={item.path}>
              <Link
                to={item.path}
                className={`flex items-center gap-3 px-4 py-2.5 rounded-lg transition-all duration-200 ${
                  isActive
                    ? 'bg-sidebar-accent text-sidebar-primary shadow-sm font-medium'
                    : 'text-sidebar-foreground/70 hover:bg-sidebar-accent hover:text-sidebar-foreground'
                }`}
              >
                <div
                  className={`w-1.5 h-1.5 rounded-full transition-all ${
                    isActive ? 'bg-primary scale-125' : 'bg-transparent'
                  }`}
                />
                <span>{item.label}</span>
                {item.badge !== undefined && (
                  <span className="ml-auto inline-flex items-center justify-center px-1.5 py-0.5 min-w-[1.25rem] h-5 text-[10px] font-bold bg-accent text-accent-foreground rounded-full shadow-sm">
                    {item.badge}
                  </span>
                )}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
