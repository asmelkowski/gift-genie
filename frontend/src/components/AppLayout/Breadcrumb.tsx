import { Link } from 'react-router-dom';
import type { BreadcrumbItem } from '@/hooks/useBreadcrumbs';

interface BreadcrumbProps {
  items: BreadcrumbItem[];
}

export function Breadcrumb({ items }: BreadcrumbProps) {
  if (items.length === 0) {
    return null;
  }

  return (
    <nav className="flex items-center gap-1 text-sm">
      <ol className="flex gap-1 list-none m-0 p-0">
        {items.map((item, index) => (
          <li key={item.path} className="flex items-center gap-1">
            {index === items.length - 1 ? (
              <span className="text-gray-600 font-medium">{item.label}</span>
            ) : (
              <>
                <Link to={item.path} className="text-blue-600 hover:underline">
                  {item.label}
                </Link>
                <span className="text-gray-400">/</span>
              </>
            )}
          </li>
        ))}
      </ol>
    </nav>
  );
}
