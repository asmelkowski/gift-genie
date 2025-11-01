import { useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Copy, Download } from 'lucide-react';
import { exportToCSV, copyToClipboard } from '@/lib/drawUtils';
import type { AssignmentWithNames } from '@/lib/drawUtils';

interface ExportActionsProps {
  assignments: AssignmentWithNames[];
  drawId: string;
  groupName?: string;
}

export default function ExportActions({
  assignments,
  drawId,
  groupName,
}: ExportActionsProps) {
  const handleCopyToClipboard = useCallback(async () => {
    try {
      await copyToClipboard(assignments, groupName);
      console.log('Copied to clipboard');
    } catch {
      console.error('Failed to copy to clipboard');
    }
  }, [assignments, groupName]);

  const handleExportCSV = useCallback(() => {
    try {
      exportToCSV(assignments, drawId);
    } catch {
      console.error('Failed to export CSV');
    }
  }, [assignments, drawId]);

  return (
    <div className="flex gap-2 mt-4 sm:mt-0">
      <Button
        variant="outline"
        onClick={handleCopyToClipboard}
        disabled={assignments.length === 0}
      >
        <Copy className="w-4 h-4 mr-2" />
        Copy
      </Button>
      <Button
        variant="outline"
        onClick={handleExportCSV}
        disabled={assignments.length === 0}
      >
        <Download className="w-4 h-4 mr-2" />
        CSV
      </Button>
    </div>
  );
}
