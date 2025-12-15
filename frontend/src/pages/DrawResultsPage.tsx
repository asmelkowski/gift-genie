import { useState, useEffect, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useDrawQuery } from '@/hooks/useDrawQuery';
import { useAssignmentsQuery } from '@/hooks/useAssignmentsQuery';
import { useGroupDetailsQuery } from '@/hooks/useGroupDetailsQuery';

import { shouldShowConfetti, clearConfettiFlag, type AssignmentWithNames } from '@/lib/drawUtils';
import PageHeader from '@/components/DrawResultsPage/PageHeader';
import DrawMetadata from '@/components/DrawResultsPage/DrawMetadata';
import AssignmentsToolbar from '@/components/DrawResultsPage/AssignmentsToolbar';
import AssignmentsTable from '@/components/DrawResultsPage/AssignmentsTable';
import ConfettiOverlay from '@/components/DrawResultsPage/ConfettiOverlay';
import ErrorState from '@/components/DrawsPage/ErrorState';
import LoadingState from '@/components/DrawsPage/LoadingState';

export default function DrawResultsPage() {
  const { groupId, drawId } = useParams<{ groupId: string; drawId: string }>();
  const navigate = useNavigate();
  const [search, setSearch] = useState('');
  const [sort, setSort] = useState<'giver_asc' | 'giver_desc' | 'receiver_asc' | 'receiver_desc'>(
    'giver_asc'
  );
  const [showConfetti, setShowConfetti] = useState(false);

  const drawQuery = useDrawQuery(drawId || '');
  const assignmentsQuery = useAssignmentsQuery(drawId || '');
  const groupQuery = useGroupDetailsQuery(drawQuery.data?.group_id || '');

  useEffect(() => {
    if (!drawQuery.isLoading && drawQuery.data) {
      if (drawQuery.data.assignments_count === 0) {
        navigate('/404');
        return;
      }

      if (shouldShowConfetti(drawId || '')) {
        setShowConfetti(true);
        clearConfettiFlag(drawId || '');
      }
    }
  }, [drawQuery.data, drawQuery.isLoading, drawId, navigate]);

  const filteredAndSortedAssignments = useMemo(() => {
    if (!assignmentsQuery.data?.data) return [];

    const assignments = assignmentsQuery.data.data as AssignmentWithNames[];

    const filtered = assignments.filter(
      a =>
        a.giver_name?.toLowerCase().includes(search.toLowerCase()) ||
        a.receiver_name?.toLowerCase().includes(search.toLowerCase())
    );

    return filtered.sort((a, b) => {
      switch (sort) {
        case 'giver_asc':
          return (a.giver_name || '').localeCompare(b.giver_name || '');
        case 'giver_desc':
          return (b.giver_name || '').localeCompare(a.giver_name || '');
        case 'receiver_asc':
          return (a.receiver_name || '').localeCompare(b.receiver_name || '');
        case 'receiver_desc':
          return (b.receiver_name || '').localeCompare(a.receiver_name || '');
        default:
          return 0;
      }
    });
  }, [assignmentsQuery.data, search, sort]);

  if (!groupId || !drawId) {
    navigate('/404');
    return null;
  }

  const handleConfettiDismiss = () => {
    setShowConfetti(false);
  };

  if (drawQuery.isLoading || assignmentsQuery.isLoading) {
    return (
      <div className="p-8 max-w-6xl mx-auto">
        <LoadingState />
      </div>
    );
  }

  if (drawQuery.isError || !drawQuery.data) {
    navigate('/404');
    return null;
  }

  if (drawQuery.data.assignments_count === 0) {
    navigate('/404');
    return null;
  }

  if (assignmentsQuery.isError) {
    return (
      <div className="p-8 max-w-6xl mx-auto">
        <ErrorState error="Failed to load assignments" />
      </div>
    );
  }

  const assignments = (assignmentsQuery.data?.data || []) as AssignmentWithNames[];

  return (
    <div className="p-8 max-w-6xl mx-auto">
      <div className="flex flex-col gap-8">
        <PageHeader
          draw={drawQuery.data}
          assignments={filteredAndSortedAssignments}
          groupName={groupQuery.data?.name}
        />

        <DrawMetadata
          draw={drawQuery.data}
          assignmentCount={assignments.length}
          groupName={groupQuery.data?.name}
        />

        <details className="border border-gray-200 rounded-lg bg-card">
          <summary className="cursor-pointer px-6 py-4 font-semibold text-foreground hover:bg-muted/50 transition-colors flex items-center gap-3">
            <span className="text-lg">🎁 View Draw Results</span>
            <span className="text-sm font-normal text-gray-600 bg-yellow-100 px-2 py-1 rounded">
              ⚠️ May spoil the fun!
            </span>
          </summary>
          <div className="p-6 pt-0">
            <AssignmentsToolbar
              search={search}
              onSearchChange={setSearch}
              sort={sort}
              onSortChange={newSort =>
                setSort(newSort as 'giver_asc' | 'giver_desc' | 'receiver_asc' | 'receiver_desc')
              }
            />

            {filteredAndSortedAssignments.length === 0 ? (
              <div className="text-center py-12">
                <p className="text-gray-600">
                  {search ? 'No assignments match your search' : 'No assignments found'}
                </p>
              </div>
            ) : (
              <AssignmentsTable assignments={filteredAndSortedAssignments} />
            )}
          </div>
        </details>
      </div>

      <ConfettiOverlay show={showConfetti} onDismiss={handleConfettiDismiss} />
    </div>
  );
}
