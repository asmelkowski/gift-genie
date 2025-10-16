import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';

interface PageHeaderProps {
  groupName: string;
  groupId: string;
  onAddClick: () => void;
}

export function PageHeader({ groupName, groupId, onAddClick }: PageHeaderProps) {
  const navigate = useNavigate();

  return (
    <div>
      <nav className="flex items-center gap-2 text-sm mb-4" aria-label="Breadcrumb">
        <button
          onClick={() => navigate('/app/groups')}
          className="text-blue-600 hover:text-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 rounded px-1"
        >
          Groups
        </button>
        <span className="text-gray-400" aria-hidden="true">/</span>
        <button
          onClick={() => navigate(`/app/groups/${groupId}`)}
          className="text-blue-600 hover:text-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 rounded px-1"
        >
          {groupName}
        </button>
        <span className="text-gray-400" aria-hidden="true">/</span>
        <span className="text-gray-600" aria-current="page">Members</span>
      </nav>
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Members</h1>
          <p className="text-gray-600 mt-1">Manage members in this group</p>
        </div>
        <Button onClick={onAddClick} className="mt-4 sm:mt-0" aria-label="Add a new member">
          Add Member
        </Button>
      </div>
    </div>
  );
}
