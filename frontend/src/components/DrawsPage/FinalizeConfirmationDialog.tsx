import { Dialog } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';

interface FinalizeConfirmationDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  isLoading: boolean;
}

export default function FinalizeConfirmationDialog({
  isOpen,
  onClose,
  onConfirm,
  isLoading,
}: FinalizeConfirmationDialogProps) {
  return (
    <Dialog isOpen={isOpen} onClose={onClose} title="Finalize Draw?">
      <div className="space-y-4">
        <div className="space-y-3">
          <p>Once finalized, this draw becomes immutable and cannot be modified.</p>
          <p className="font-semibold text-gray-900">
            This action cannot be undone.
          </p>
        </div>
        <div className="flex gap-3 justify-end pt-4">
          <Button
            variant="outline"
            onClick={onClose}
            disabled={isLoading}
          >
            Cancel
          </Button>
          <Button
            onClick={onConfirm}
            disabled={isLoading}
            className="bg-blue-600 hover:bg-blue-700"
          >
            {isLoading ? 'Finalizing...' : 'Confirm'}
          </Button>
        </div>
      </div>
    </Dialog>
  );
}
