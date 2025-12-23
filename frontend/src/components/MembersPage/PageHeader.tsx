import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Button } from '@/components/ui/button';

interface PageHeaderProps {
  groupName: string;
  groupId: string;
  onAddClick: () => void;
}

export function PageHeader({ groupName, groupId, onAddClick }: PageHeaderProps) {
  const navigate = useNavigate();
  const { t } = useTranslation('members');

  return (
    <div data-testid="members-page-header">
      <nav className="flex items-center gap-2 text-sm mb-4" aria-label="Breadcrumb">
        <button
          onClick={() => navigate('/app/groups')}
          className="text-blue-600 hover:text-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 rounded px-1"
        >
          {t('header.breadcrumb.groups')}
        </button>
        <span className="text-gray-400" aria-hidden="true">
          /
        </span>
        <button
          onClick={() => navigate(`/app/groups/${groupId}`)}
          className="text-blue-600 hover:text-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 rounded px-1"
        >
          {groupName}
        </button>
        <span className="text-gray-400" aria-hidden="true">
          /
        </span>
        <span className="text-gray-600" aria-current="page">
          {t('header.breadcrumb.members')}
        </span>
      </nav>
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-3xl font-bold text-foreground">{t('header.title')}</h1>
          <p className="text-gray-600 mt-1">{t('header.subtitle')}</p>
        </div>
        <Button onClick={onAddClick} className="mt-4 sm:mt-0" aria-label={t('header.addButton')}>
          {t('header.addButton')}
        </Button>
      </div>
    </div>
  );
}
