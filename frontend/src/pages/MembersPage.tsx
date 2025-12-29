import { useCallback, useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
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
import { isForbiddenError } from '@/lib/errors';
import { AccessDeniedState } from '@/components/ui/AccessDeniedState';
import type { components } from '@/types/schema';

type MemberResponse = components['schemas']['MemberResponse'];

export function MembersPage() {
  const { groupId } = useParams<{ groupId: string }>();
  const { t } = useTranslation('members');
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingMember, setEditingMember] = useState<MemberResponse | null>(null);
  const { params, updateParams } = useMembersParams();
  const { data, isLoading, error, refetch } = useMembersQuery(groupId!, params);
  const { error: groupError } = useGroupDetailsQuery(groupId!);
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

  if (isLoading) {
    return (
      <div className="space-y-6">
        <PageHeader onAddClick={handleAddClick} />
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

  // Check for 403 errors in either the members query or the group details query
  if (error || groupError) {
    if (isForbiddenError(error) || isForbiddenError(groupError)) {
      return (
        <div className="space-y-6">
          <PageHeader onAddClick={handleAddClick} />
          <AccessDeniedState
            message={
              t('accessDenied.message') ||
              "You don't have permission to view members of this group."
            }
            onRetry={() => refetch()}
          />
        </div>
      );
    }
    // Show regular error state for non-403 errors
    if (error) {
      return (
        <div className="space-y-6">
          <PageHeader onAddClick={handleAddClick} />
          <ErrorState error={error as Error} onRetry={() => refetch()} />
        </div>
      );
    }
  }

  const members = data?.data || [];
  const meta = data?.meta;

  if (members.length === 0 && !params.search && params.is_active === null) {
    return (
      <div className="space-y-6">
        <PageHeader onAddClick={handleAddClick} />
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
      <PageHeader onAddClick={handleAddClick} />
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
          <h3 className="text-lg font-semibold text-foreground mb-2">{t('searchEmpty.title')}</h3>
          <p className="text-gray-600 mb-4">
            {params.search
              ? t('searchEmpty.descriptionSearch', { search: params.search })
              : t('searchEmpty.descriptionFilters')}
          </p>
          <button
            onClick={() => updateParams({ search: '', is_active: null })}
            className="text-blue-600 hover:text-blue-700 font-medium"
          >
            {t('searchEmpty.clearButton')}
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
