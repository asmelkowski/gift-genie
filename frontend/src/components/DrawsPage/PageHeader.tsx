import { Button } from '@/components/ui/button';

interface PageHeaderProps {
  groupId: string;
  groupName?: string;
  onCreateClick: () => void;
  isLoading?: boolean;
}

export default function PageHeader({ onCreateClick, isLoading }: PageHeaderProps) {
  return (
    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between mb-6">
      <div>
        <h1 className="text-3xl font-bold text-gray-900">Draws</h1>
        <p className="text-gray-600 mt-1">Create and manage gift exchange draws</p>
      </div>
      <Button onClick={onCreateClick} className="mt-4 sm:mt-0" disabled={isLoading}>
        Create Draw
      </Button>
    </div>
  );
}
