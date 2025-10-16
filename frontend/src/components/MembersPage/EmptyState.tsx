import { Button } from '@/components/ui/button';

interface EmptyStateProps {
  onAddClick: () => void;
}

export function EmptyState({ onAddClick }: EmptyStateProps) {
  return (
    <div className="text-center py-12">
      <h3 className="text-lg font-semibold text-gray-900 mb-2">No members yet</h3>
      <p className="text-gray-600 mb-6">
        Add members to your group to start organizing gift exchanges
      </p>
      <Button onClick={onAddClick}>Add Member</Button>
    </div>
  );
}
