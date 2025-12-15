import { useCallback, useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { PageHeader } from '@/components/MembersPage/PageHeader';
import { MembersToolbar } from '@/components/MembersPage/MembersToolbar';
import { MembersGrid } from '@/components/MembersPage/MembersGrid';
import { LoadingState } from '@/components/MembersPage/LoadingState';
import { ErrorState } from '@/components/MembersPage/ErrorState';
import { EmptyState } from '@/components/MembersPage/EmptyState';
import { PaginationControls } from '@/components/MembersPage/PaginationControls';
import { MemberDialog } from '@/components/MembersPage/MemberDialog';
import { useMembersQuery } from '@/hooks/useMembersQuery';
import { useMembersParams } from '@/components/MembersPage/useMembersParams';
import { useDeleteMemberMutation } from '@/hooks/useDeleteMemberMutation';
import { useGroupDetailsQuery } from '@/hooks/useGroupDetailsQuery';
import type { components } from '@/types/schema';

type MemberResponse = components['schemas']['MemberResponse'];

export function MembersPage() {
  const { groupId } = useParams<{ groupId: string }>();
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingMember, setEditingMember] = useState<MemberResponse | null>(null);
  const { params, updateParams } = useMembersParams();
  const { data, isLoading, error, refetch } = useMembersQuery(groupId!, params);
  const { data: groupData } = useGroupDetailsQuery(groupId!);
  const deleteMutation = useDeleteMemberMutation(groupId!);

  useEffect(() => {
    window.scrollTo(0, 0);
  }, [params.page]);

  const handleAddClick = useCallback(() => {
    setEditingMember(null);
    setIsDialogOpen(true);
  }, []);

  const handleEditClick = useCallback((member: MemberResponse) => {
    setEditingMember(member);
    setIsDialogOpen(true);
  }, []);

  const handleDialogClose = useCallback(() => {
    setIsDialogOpen(false);
    setEditingMember(null);
  }, []);

  const handleDeleteClick = useCallback(
    (memberId: string) => {
      deleteMutation.mutate(memberId);
    },
    [deleteMutation]
  );

  const handleActiveFilterChange = useCallback(
    (value: boolean | null) => {
      updateParams({ is_active: value });
    },
    [updateParams]
  );

  const handleSearchChange = useCallback(
    (value: string) => {
      updateParams({ search: value });
    },
    [updateParams]
  );

  const handleSortChange = useCallback(
    (value: string) => {
      updateParams({ sort: value });
    },
    [updateParams]
  );

  const handlePageChange = useCallback(
    (page: number) => {
      updateParams({ page });
    },
    [updateParams]
  );

  const groupName = groupData?.name || 'Members';

  if (isLoading) {
    return (
      <div className="space-y-6">
        <PageHeader groupName={groupName} groupId={groupId!} onAddClick={handleAddClick} />
        <MembersToolbar
          isActive={params.is_active ?? null}
          search={params.search || ''}
          sort={params.sort || 'name'}
          onActiveFilterChange={handleActiveFilterChange}
          onSearchChange={handleSearchChange}
          onSortChange={handleSortChange}
        />
        <LoadingState />
      </div>
    );
  }

  if (error) {
    return (
      <div className="space-y-6">
        <PageHeader groupName={groupName} groupId={groupId!} onAddClick={handleAddClick} />
        <ErrorState error={error as Error} onRetry={() => refetch()} />
      </div>
    );
  }

  const members = data?.data || [];
  const meta = data?.meta;

  if (members.length === 0 && !params.search && params.is_active === null) {
    return (
      <div className="space-y-6">
        <PageHeader groupName={groupName} groupId={groupId!} onAddClick={handleAddClick} />
        <EmptyState onAddClick={handleAddClick} />
        <MemberDialog
          isOpen={isDialogOpen}
          onClose={handleDialogClose}
          member={editingMember}
          groupId={groupId!}
        />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <PageHeader groupName={groupName} groupId={groupId!} onAddClick={handleAddClick} />
      <MembersToolbar
        isActive={params.is_active ?? null}
        search={params.search || ''}
        sort={params.sort || 'name'}
        onActiveFilterChange={handleActiveFilterChange}
        onSearchChange={handleSearchChange}
        onSortChange={handleSortChange}
      />

      {members.length === 0 && (params.search || params.is_active !== null) ? (
        <div className="text-center py-12">
          <h3 className="text-lg font-semibold text-foreground mb-2">No members found</h3>
          <p className="text-gray-600 mb-4">
            {params.search
              ? `No members match "${params.search}".`
              : 'No members match the selected filters.'}
          </p>
          <button
            onClick={() => updateParams({ search: '', is_active: null })}
            className="text-blue-600 hover:text-blue-700 font-medium"
          >
            Clear filters
          </button>
        </div>
      ) : (
        <>
          <MembersGrid
            members={members}
            onMemberEdit={handleEditClick}
            onMemberDelete={handleDeleteClick}
          />
          {meta && meta.total_pages > 1 && (
            <PaginationControls meta={meta} onPageChange={handlePageChange} />
          )}
        </>
      )}

      <MemberDialog
        isOpen={isDialogOpen}
        onClose={handleDialogClose}
        member={editingMember}
        groupId={groupId!}
      />
    </div>
  );
}
