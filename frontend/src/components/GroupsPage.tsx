import { useCallback, useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
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

export function GroupsPage() {
  const navigate = useNavigate();
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const { params, updateParams } = useGroupsParams();
  const { data, isLoading, error, refetch } = useGroupsQuery(params);

  const groups = data?.data || [];
  const meta = data?.meta;

  useEffect(() => {
    window.scrollTo(0, 0);
  }, [params.page]);

  useEffect(() => {
    if (meta && meta.total_pages > 0 && params.page > meta.total_pages) {
      updateParams({ page: 1 });
    }
  }, [meta, params.page, updateParams]);

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
      </div>
    );
  }

  if (error) {
    return (
      <div className="space-y-6">
        <PageHeader onCreateClick={handleCreateClick} />
        <ErrorState error={error as Error} onRetry={() => refetch()} />
      </div>
    );
  }

  if (groups.length === 0 && !params.search) {
    return (
      <div className="space-y-6">
        <PageHeader onCreateClick={handleCreateClick} />
        <GroupsToolbar
          search={params.search || ''}
          sort={params.sort || '-created_at'}
          onSearchChange={handleSearchChange}
          onSortChange={handleSortChange}
        />
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
          <h3 className="text-lg font-semibold text-gray-900 mb-2">
            No groups found
          </h3>
          <p className="text-gray-600 mb-4">
            No groups match "{params.search}". Try a different search term.
          </p>
           <button
             onClick={() => updateParams({ search: '' })}
             className="text-blue-600 hover:text-blue-700 font-medium"
             data-testid="clear-search-button"
           >
             Clear search
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