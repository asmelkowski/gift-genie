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
    <nav className="flex items-center text-sm min-w-0">
      <ol className="flex items-center gap-1 list-none m-0 p-0 min-w-0">
        {items.map((item, index) => (
          <li key={item.path} className="flex items-center gap-1 min-w-0">
            {index === items.length - 1 || !item.path ? (
              <span
                className={`font-medium truncate ${index === items.length - 1 ? 'text-muted-foreground' : 'text-foreground/70'}`}
              >
                {item.label}
              </span>
            ) : (
              <Link to={item.path} className="text-primary hover:underline whitespace-nowrap">
                {item.label}
              </Link>
            )}
            {index < items.length - 1 && (
              <span className="text-muted-foreground/60 shrink-0">/</span>
            )}
          </li>
        ))}
      </ol>
    </nav>
  );
}
