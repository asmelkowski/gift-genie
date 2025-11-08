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
    <nav className="hidden lg:flex lg:flex-col w-64 bg-gray-50 border-r border-gray-200 p-6 overflow-y-auto flex-shrink-0">
      <ul className="space-y-2 list-none m-0 p-0">
        {items.map(item => {
          const isActive = currentPath === item.path || currentPath.startsWith(`${item.path}/`);

          return (
            <li key={item.path}>
              <Link
                to={item.path}
                className={`flex items-center gap-3 px-4 py-2 rounded-md transition-colors ${
                  isActive
                    ? 'bg-blue-50 text-blue-600 border-l-4 border-blue-600 font-semibold'
                    : 'text-gray-700 hover:bg-gray-100'
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
  );
}
