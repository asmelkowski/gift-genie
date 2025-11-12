import { Button } from '@/components/ui/button';

interface PageHeaderProps {
  onCreateClick: () => void;
}

export function PageHeader({ onCreateClick }: PageHeaderProps) {
  return (
    <div
      className="flex flex-col sm:flex-row sm:items-center sm:justify-between mb-6"
      data-testid="groups-page-header"
    >
      <div>
        <h1 className="text-3xl font-bold text-gray-900">Groups</h1>
        <p className="text-gray-600 mt-1">Manage your gift exchange groups</p>
      </div>
      <Button onClick={onCreateClick} className="mt-4 sm:mt-0">
        Create Group
      </Button>
    </div>
  );
}
