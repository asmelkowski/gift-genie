import { useState } from 'react';
import { useParams } from 'react-router-dom';
import { useDrawsQuery } from '@/hooks/useDrawsQuery';
import { useDrawsParams } from '@/hooks/useDrawsParams';
import { useCreateDrawMutation } from '@/hooks/useCreateDrawMutation';
import { useExecuteDrawMutation } from '@/hooks/useExecuteDrawMutation';
import { useFinalizeDrawMutation } from '@/hooks/useFinalizeDrawMutation';
import { useNotifyDrawMutation } from '@/hooks/useNotifyDrawMutation';
import { useDeleteDrawMutation } from '@/hooks/useDeleteDrawMutation';
import { useGroupDetailsQuery } from '@/hooks/useGroupDetailsQuery';
import { transformToDrawViewModel, type DrawViewModel } from '@/lib/drawUtils';
import PageHeader from './PageHeader';
import DrawsToolbar from './DrawsToolbar';
import DrawsGrid from './DrawsGrid';
import LoadingState from './LoadingState';
import ErrorState from './ErrorState';
import EmptyState from './EmptyState';
import PaginationControls from './PaginationControls';
import ExecuteDrawLoadingOverlay from './ExecuteDrawLoadingOverlay';
import FinalizeConfirmationDialog from './FinalizeConfirmationDialog';
import NotifyDrawDialog from './NotifyDrawDialog';
import NotificationResultDialog from './NotificationResultDialog';
import ErrorGuidanceAlert from './ErrorGuidanceAlert';
import type { components } from '@/types/schema';

type NotifyDrawResponse = components['schemas']['NotifyDrawResponse'];

export default function DrawsPage() {
  const { groupId } = useParams<{ groupId: string }>();
  const { params, updateParams } = useDrawsParams();

  const [executingDrawId, setExecutingDrawId] = useState<string | null>(null);
  const [finalizeDialogOpen, setFinalizeDialogOpen] = useState(false);
  const [selectedDrawForFinalize, setSelectedDrawForFinalize] =
    useState<DrawViewModel | null>(null);
  const [notifyDialogOpen, setNotifyDialogOpen] = useState(false);
  const [selectedDrawForNotify, setSelectedDrawForNotify] =
    useState<DrawViewModel | null>(null);
  const [notifyResult, setNotifyResult] = useState<NotifyDrawResponse | null>(
    null
  );
  const [executeError, setExecuteError] = useState<string | null>(null);

  if (!groupId) {
    return <ErrorState error="Group not found" />;
  }

  const drawsQuery = useDrawsQuery({
    groupId,
    status: params.status,
    page: params.page,
    page_size: params.page_size,
    sort: params.sort,
  });

  const groupQuery = useGroupDetailsQuery(groupId);
  const createDrawMutation = useCreateDrawMutation(groupId);
  const executeDrawMutation = useExecuteDrawMutation(groupId);
  const finalizeDrawMutation = useFinalizeDrawMutation(groupId);
  const notifyDrawMutation = useNotifyDrawMutation(groupId);
  const deleteDrawMutation = useDeleteDrawMutation(groupId);

  const handleCreateDraw = async () => {
    await createDrawMutation.mutateAsync();
  };

  const handleExecuteClick = async (draw: DrawViewModel) => {
    setExecutingDrawId(draw.id);
    setExecuteError(null);
    try {
      await executeDrawMutation.mutateAsync(draw.id);
    } catch (error: any) {
      if (error.response?.status === 422) {
        setExecuteError(
          error.response?.data?.detail || 'No valid configuration found'
        );
      }
    } finally {
      setExecutingDrawId(null);
    }
  };

  const handleFinalizeClick = (draw: DrawViewModel) => {
    setSelectedDrawForFinalize(draw);
    setFinalizeDialogOpen(true);
  };

  const handleFinalizeConfirm = async () => {
    if (selectedDrawForFinalize) {
      await finalizeDrawMutation.mutateAsync(selectedDrawForFinalize.id);
      setFinalizeDialogOpen(false);
      setSelectedDrawForFinalize(null);
    }
  };

  const handleNotifyClick = (draw: DrawViewModel) => {
    setSelectedDrawForNotify(draw);
    setNotifyDialogOpen(true);
  };

  const handleNotifyConfirm = async (resend: boolean) => {
    if (selectedDrawForNotify) {
      try {
        const result = await notifyDrawMutation.mutateAsync({
          drawId: selectedDrawForNotify.id,
          resend,
        });
        setNotifyResult(result);
        setNotifyDialogOpen(false);
      } catch (error) {
        setNotifyDialogOpen(false);
      }
    }
  };

  const handleDeleteClick = (drawId: string) => {
    if (
      confirm(
        'Are you sure you want to delete this draw? This action cannot be undone.'
      )
    ) {
      deleteDrawMutation.mutate(drawId);
    }
  };

  const handleStatusChange = (status: 'all' | 'pending' | 'finalized') => {
    updateParams({
      status: status === 'all' ? undefined : status,
      page: 1,
    });
  };

  const handleSortChange = (sort: string) => {
    updateParams({ sort, page: 1 });
  };

  const handlePageChange = (page: number) => {
    updateParams({ page });
  };

  const transformedDraws: DrawViewModel[] =
    drawsQuery.data?.data.map((draw) => transformToDrawViewModel(draw)) || [];

  const groupName = groupQuery.data?.name;

  let statusDisplay: 'all' | 'pending' | 'finalized' = 'all';
  if (params.status === 'pending') statusDisplay = 'pending';
  if (params.status === 'finalized') statusDisplay = 'finalized';

  return (
    <div className="p-8 max-w-6xl mx-auto">
      <div className="flex flex-col gap-8">
        <PageHeader
          groupId={groupId}
          groupName={groupName}
          onCreateClick={handleCreateDraw}
          isLoading={createDrawMutation.isPending}
        />

        {drawsQuery.isLoading ? (
          <LoadingState />
        ) : drawsQuery.isError ? (
          <ErrorState error="Failed to load draws" />
        ) : (
          <>
            {executeError && (
              <ErrorGuidanceAlert error={executeError} groupId={groupId} />
            )}

            <DrawsToolbar
              status={statusDisplay}
              onStatusChange={handleStatusChange}
              sort={params.sort}
              onSortChange={handleSortChange}
            />

            {transformedDraws.length === 0 ? (
              <EmptyState />
            ) : (
              <>
                <DrawsGrid
                  draws={transformedDraws}
                  groupId={groupId!}
                  onExecute={handleExecuteClick}
                  onFinalize={handleFinalizeClick}
                  onNotify={handleNotifyClick}
                  onDelete={handleDeleteClick}
                  isExecuting={executingDrawId !== null}
                />

                <PaginationControls
                  currentPage={params.page}
                  pageSize={params.page_size}
                  totalItems={drawsQuery.data?.meta.total || 0}
                  onPageChange={handlePageChange}
                />
              </>
            )}
          </>
        )}
      </div>

      <ExecuteDrawLoadingOverlay isVisible={executingDrawId !== null} />

      {selectedDrawForFinalize && (
        <FinalizeConfirmationDialog
          isOpen={finalizeDialogOpen}
          onClose={() => {
            setFinalizeDialogOpen(false);
            setSelectedDrawForFinalize(null);
          }}
          onConfirm={handleFinalizeConfirm}
          isLoading={finalizeDrawMutation.isPending}
        />
      )}

      {selectedDrawForNotify && (
        <NotifyDrawDialog
          isOpen={notifyDialogOpen}
          onClose={() => {
            setNotifyDialogOpen(false);
            setSelectedDrawForNotify(null);
          }}
          onConfirm={handleNotifyConfirm}
          draw={selectedDrawForNotify}
          isLoading={notifyDrawMutation.isPending}
        />
      )}

      {notifyResult && (
        <NotificationResultDialog
          isOpen={!!notifyResult}
          onClose={() => setNotifyResult(null)}
          result={notifyResult}
        />
      )}
    </div>
  );
}
