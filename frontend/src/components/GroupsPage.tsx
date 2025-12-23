import { useCallback, useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { PageHeader } from './GroupsPage/PageHeader';
import { GroupsToolbar } from './GroupsPage/GroupsToolbar';
import { GroupsGrid } from './GroupsPage/GroupsGrid';
import { LoadingState } from './GroupsPage/LoadingState';
import { ErrorState } from './GroupsPage/ErrorState';
import { EmptyState } from './GroupsPage/EmptyState';
import { PaginationControls } from './GroupsPage/PaginationControls';
import { CreateGroupDialog } from './GroupsPage/CreateGroupDialog';
import { useGroupsQuery } from '@/hooks/useGroupsQuery';
import { useGroupsParams } from './GroupsPage/useGroupsParams';
import { isForbiddenError } from '@/lib/errors';
import { AccessDeniedState } from '@/components/ui/AccessDeniedState';

export function GroupsPage() {
  const { t } = useTranslation('groups');
  const navigate = useNavigate();
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const { params, updateParams } = useGroupsParams();
  const { data, isLoading, error, refetch } = useGroupsQuery(params);

  useEffect(() => {
    window.scrollTo(0, 0);
  }, [params.page]);

  const handleCreateClick = useCallback(() => {
    setIsDialogOpen(true);
  }, []);

  const handleDialogClose = useCallback(() => {
    setIsDialogOpen(false);
  }, []);

  const handleGroupClick = useCallback(
    (groupId: string) => {
      navigate(`/app/groups/${groupId}`);
    },
    [navigate]
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
        <PageHeader onCreateClick={handleCreateClick} />
        <GroupsToolbar
          search={params.search || ''}
          sort={params.sort || '-created_at'}
          onSearchChange={handleSearchChange}
          onSortChange={handleSortChange}
        />
        <LoadingState />
        <CreateGroupDialog isOpen={isDialogOpen} onClose={handleDialogClose} />
      </div>
    );
  }

  if (error) {
    if (isForbiddenError(error)) {
      return (
        <div className="space-y-6">
          <PageHeader onCreateClick={handleCreateClick} />
          <AccessDeniedState message={t('accessDenied.message')} onRetry={() => refetch()} />
          <CreateGroupDialog isOpen={isDialogOpen} onClose={handleDialogClose} />
        </div>
      );
    }
    return (
      <div className="space-y-6">
        <PageHeader onCreateClick={handleCreateClick} />
        <ErrorState error={error as Error} onRetry={() => refetch()} />
        <CreateGroupDialog isOpen={isDialogOpen} onClose={handleDialogClose} />
      </div>
    );
  }

  const groups = data?.data || [];
  const meta = data?.meta;

  if (groups.length === 0 && !params.search) {
    return (
      <div className="space-y-6">
        <PageHeader onCreateClick={handleCreateClick} />
        <EmptyState onCreateClick={handleCreateClick} />
        <CreateGroupDialog isOpen={isDialogOpen} onClose={handleDialogClose} />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <PageHeader onCreateClick={handleCreateClick} />
      <GroupsToolbar
        search={params.search || ''}
        sort={params.sort || '-created_at'}
        onSearchChange={handleSearchChange}
        onSortChange={handleSortChange}
      />

      {groups.length === 0 && params.search ? (
        <div className="text-center py-12">
          <h3 className="text-lg font-semibold text-foreground mb-2">{t('searchEmpty.title')}</h3>
          <p className="text-muted-foreground mb-4">
            {t('searchEmpty.description', { search: params.search })}
          </p>
          <button
            onClick={() => updateParams({ search: '' })}
            className="text-primary hover:underline font-medium"
          >
            {t('searchEmpty.clearButton')}
          </button>
        </div>
      ) : (
        <>
          <GroupsGrid groups={groups} onGroupClick={handleGroupClick} />
          {meta && <PaginationControls meta={meta} onPageChange={handlePageChange} />}
        </>
      )}

      <CreateGroupDialog isOpen={isDialogOpen} onClose={handleDialogClose} />
    </div>
  );
}
