import { useCallback, useMemo, useState } from 'react';
import { useParams } from 'react-router-dom';
import { useExclusionsQuery } from '@/hooks/useExclusionsQuery';
import { useMembersQuery } from '@/hooks/useMembersQuery';
import { useCreateExclusionMutation } from '@/hooks/useCreateExclusionMutation';
import { useDeleteExclusionMutation } from '@/hooks/useDeleteExclusionMutation';
import { ExclusionDialog } from './ExclusionDialog';
import { ExclusionCard } from './ExclusionCard';
import { ExclusionsToolbar } from './ExclusionsToolbar';
import { PaginationControls } from './PaginationControls';
import { LoadingState } from './LoadingState';
import { ErrorState } from './ErrorState';
import { EmptyState } from './EmptyState';
import type { components } from '@/types/schema';

type ExclusionType = components['schemas']['ExclusionType'];

export function ExclusionsPage() {
  const { groupId } = useParams<{ groupId: string }>();
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [filterType, setFilterType] = useState<'all' | 'manual' | 'historical'>('all');
  const [sortBy, setSortBy] = useState('exclusion_type,name');
  const [page, setPage] = useState(1);
  const pageSize = 10;

  const exclusionType: ExclusionType | undefined = useMemo(
    () => (filterType === 'all' ? undefined : filterType),
    [filterType]
  );

  const {
    data: exclusionsData,
    isLoading: exclusionsLoading,
    error: exclusionsError,
  } = useExclusionsQuery({
    groupId: groupId || '',
    type: exclusionType,
    page,
    page_size: pageSize,
    sort: sortBy,
  });

  const { data: membersData } = useMembersQuery(groupId || '', {
    page_size: 100,
  });

  const createExclusionMutation = useCreateExclusionMutation(groupId || '');
  const deleteExclusionMutation = useDeleteExclusionMutation(groupId || '');

  const members = useMemo(() => membersData?.data || [], [membersData]);

  const exclusionsWithMembers = useMemo(() => {
    if (!exclusionsData?.data) return [];

    return exclusionsData.data.map(exclusion => {
      const giverMember = members.find(m => m.id === exclusion.giver_member_id);
      const receiverMember = members.find(m => m.id === exclusion.receiver_member_id);
      return {
        ...exclusion,
        giverName: giverMember?.name || 'Unknown',
        receiverName: receiverMember?.name || 'Unknown',
        giverMember,
        receiverMember,
      };
    });
  }, [exclusionsData?.data, members]);

  const handleCreateExclusion = useCallback(
    async (giverMemberId: string, receiverMemberId: string, isMutual: boolean) => {
      await createExclusionMutation.mutateAsync({
        giver_member_id: giverMemberId,
        receiver_member_id: receiverMemberId,
        is_mutual: isMutual,
      });
    },
    [createExclusionMutation]
  );

  const handleDeleteExclusion = useCallback(
    (exclusionId: string) => {
      if (window.confirm('Are you sure you want to delete this exclusion?')) {
        deleteExclusionMutation.mutate(exclusionId);
      }
    },
    [deleteExclusionMutation]
  );

  if (!groupId) {
    return <ErrorState message="Group ID not found" />;
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-foreground">Exclusions</h1>
        <p className="text-gray-600 mt-2">
          Manage exclusions to prevent specific member pairings in gift draws.
        </p>
      </div>

      <ExclusionsToolbar
        onCreateClick={() => setIsDialogOpen(true)}
        filterType={filterType}
        onFilterChange={setFilterType}
        sortBy={sortBy}
        onSortChange={setSortBy}
      />

      <ExclusionDialog
        isOpen={isDialogOpen}
        onClose={() => setIsDialogOpen(false)}
        members={members}
        groupId={groupId}
        onSubmit={handleCreateExclusion}
        isLoading={createExclusionMutation.isPending}
      />

      {exclusionsLoading ? (
        <LoadingState />
      ) : exclusionsError ? (
        <ErrorState message="Failed to load exclusions" />
      ) : exclusionsWithMembers.length === 0 ? (
        <EmptyState
          message={
            filterType === 'historical'
              ? 'No historical exclusions found. Historical exclusions are created automatically from past draws.'
              : 'No exclusions found. Create one to prevent specific member pairings.'
          }
        />
      ) : (
        <>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {exclusionsWithMembers.map(exclusion => (
              <ExclusionCard
                key={exclusion.id}
                exclusion={exclusion}
                giverName={exclusion.giverName}
                receiverName={exclusion.receiverName}
                giverMember={exclusion.giverMember}
                receiverMember={exclusion.receiverMember}
                onDelete={handleDeleteExclusion}
                isLoading={deleteExclusionMutation.isPending}
              />
            ))}
          </div>

          {exclusionsData && (
            <PaginationControls
              page={page}
              totalPages={exclusionsData.meta.total_pages}
              total={exclusionsData.meta.total}
              pageSize={pageSize}
              onPageChange={setPage}
              isLoading={exclusionsLoading}
            />
          )}
        </>
      )}
    </div>
  );
}
