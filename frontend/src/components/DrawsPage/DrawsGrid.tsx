import DrawCard from './DrawCard';
import type { DrawViewModel } from '@/lib/drawUtils';

interface DrawsGridProps {
  draws: DrawViewModel[];
  groupId: string;
  onExecute: (draw: DrawViewModel) => Promise<void>;
  onFinalize: (draw: DrawViewModel) => void;
  onNotify: (draw: DrawViewModel) => void;
  onDelete: (drawId: string) => void;
  isExecuting: boolean;
}

export default function DrawsGrid({
  draws,
  groupId,
  onExecute,
  onFinalize,
  onNotify,
  onDelete,
  isExecuting,
}: DrawsGridProps) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
      {draws.map((draw) => (
        <DrawCard
          key={draw.id}
          draw={draw}
          groupId={groupId}
          onExecute={onExecute}
          onFinalize={onFinalize}
          onNotify={onNotify}
          onDelete={onDelete}
          isLoading={isExecuting}
        />
      ))}
    </div>
  );
}
