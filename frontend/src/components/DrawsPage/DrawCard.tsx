import { useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { CheckCircle, Zap, Mail } from 'lucide-react';
import type { DrawViewModel } from '@/lib/drawUtils';

interface DrawCardProps {
  draw: DrawViewModel;
  groupId: string;
  onExecute: (draw: DrawViewModel) => Promise<void>;
  onFinalize: (draw: DrawViewModel) => void;
  onNotify: (draw: DrawViewModel) => void;
  onDelete: (drawId: string) => void;
  isLoading: boolean;
}

export default function DrawCard({
  draw,
  groupId,
  onExecute,
  onFinalize,
  onNotify,
  onDelete,
  isLoading,
}: DrawCardProps) {
  const navigate = useNavigate();

  const handleExecute = useCallback(async () => {
    await onExecute(draw);
  }, [draw, onExecute]);

  const handleViewResults = useCallback(() => {
    navigate(`/app/groups/${groupId}/draws/${draw.id}/results`);
  }, [groupId, draw.id, navigate]);

  return (
    <div className="border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow">
      <div className="flex items-start justify-between mb-4">
        <div>
          <h3 className="font-semibold text-foreground">Draw #{draw.id.slice(0, 8)}</h3>
          <p className="text-sm text-gray-500">{draw.formattedCreatedAt}</p>
        </div>
        <div
          className={`px-2 py-1 rounded text-sm font-semibold ${
            draw.statusColor === 'green'
              ? 'bg-green-100 text-green-800'
              : 'bg-yellow-100 text-yellow-800'
          }`}
        >
          {draw.statusLabel}
        </div>
      </div>

      <div className="mb-4 space-y-2 text-sm text-gray-600">
        {draw.formattedFinalizedAt && (
          <div className="flex items-center gap-2">
            <CheckCircle className="w-4 h-4" />
            <span>Finalized: {draw.formattedFinalizedAt}</span>
          </div>
        )}
        {draw.formattedNotificationSentAt && (
          <div className="flex items-center gap-2">
            <Mail className="w-4 h-4" />
            <span>Notified: {draw.formattedNotificationSentAt}</span>
          </div>
        )}
      </div>

      <DrawLifecycleStepper draw={draw} />

      <div className="flex flex-wrap gap-2 mt-4">
        {draw.canExecute && (
          <Button size="sm" variant="outline" onClick={handleExecute} disabled={isLoading}>
            <Zap className="w-4 h-4 mr-2" />
            Execute
          </Button>
        )}
        {draw.canFinalize && (
          <Button size="sm" variant="outline" onClick={() => onFinalize(draw)}>
            <CheckCircle className="w-4 h-4 mr-2" />
            Finalize
          </Button>
        )}
        {draw.canNotify && (
          <Button size="sm" variant="outline" onClick={() => onNotify(draw)}>
            <Mail className="w-4 h-4 mr-2" />
            Notify
          </Button>
        )}
        {draw.canViewResults && (
          <Button size="sm" variant="outline" onClick={handleViewResults}>
            View Results
          </Button>
        )}
        {draw.canDelete && (
          <Button
            size="sm"
            variant="outline"
            onClick={() => onDelete(draw.id)}
            className="text-red-600 hover:text-red-700"
          >
            Delete
          </Button>
        )}
      </div>
    </div>
  );
}

function DrawLifecycleStepper({ draw }: { draw: DrawViewModel }) {
  const steps = [
    { label: 'Created', completed: true },
    {
      label: 'Executed',
      completed: draw.lifecycleStep !== 'created',
    },
    {
      label: 'Finalized',
      completed: draw.lifecycleStep === 'finalized' || draw.lifecycleStep === 'notified',
    },
    {
      label: 'Notified',
      completed: draw.lifecycleStep === 'notified',
    },
  ];

  return (
    <div className="flex items-center justify-between mb-4 px-2 py-2 bg-gray-50 rounded">
      {steps.map((step, idx) => (
        <div key={idx} className="flex items-center flex-1">
          <div
            className={`flex items-center justify-center w-6 h-6 rounded-full text-xs font-semibold ${
              step.completed ? 'bg-green-100 text-green-700' : 'bg-gray-200 text-gray-600'
            }`}
          >
            {step.completed ? '✓' : idx + 1}
          </div>
          {idx < steps.length - 1 && (
            <div
              className={`flex-1 h-0.5 mx-1 ${step.completed ? 'bg-green-200' : 'bg-gray-200'}`}
            />
          )}
        </div>
      ))}
    </div>
  );
}
