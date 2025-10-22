import type { components } from '@/types/schema';

type DrawResponse = components['schemas']['DrawResponse'];

export interface DrawViewModel extends DrawResponse {
  statusLabel: 'Pending' | 'Finalized';
  statusColor: 'yellow' | 'green';
  formattedCreatedAt: string;
  formattedFinalizedAt: string | null;
  formattedNotificationSentAt: string | null;
  hasAssignments: boolean;
  canExecute: boolean;
  canFinalize: boolean;
  canNotify: boolean;
  canDelete: boolean;
  canViewResults: boolean;
  lifecycleStep: 'created' | 'executed' | 'finalized' | 'notified';
  isNotified: boolean;
}

export interface AssignmentWithNames {
  id: string;
  draw_id: string;
  giver_member_id: string;
  receiver_member_id: string;
  giver_name: string;
  receiver_name: string;
  created_at: string;
}

export function formatDrawTimestamp(date: string): string {
  return new Date(date).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
  });
}

export function transformToDrawViewModel(draw: DrawResponse): DrawViewModel {
  const isPending = draw.status === 'pending';
  const isFinalized = draw.status === 'finalized';
  const isNotified = draw.notification_sent_at !== null;
  const hasAssignments = draw.assignments_count > 0;

  let lifecycleStep: 'created' | 'executed' | 'finalized' | 'notified';
  if (isNotified) {
    lifecycleStep = 'notified';
  } else if (isFinalized) {
    lifecycleStep = 'finalized';
  } else if (hasAssignments) {
    lifecycleStep = 'executed';
  } else {
    lifecycleStep = 'created';
  }

  return {
    ...draw,
    statusLabel: isFinalized ? 'Finalized' : 'Pending',
    statusColor: isFinalized ? 'green' : 'yellow',
    formattedCreatedAt: formatDrawTimestamp(draw.created_at),
    formattedFinalizedAt: draw.finalized_at
      ? formatDrawTimestamp(draw.finalized_at)
      : null,
    formattedNotificationSentAt: draw.notification_sent_at
      ? formatDrawTimestamp(draw.notification_sent_at)
      : null,
    hasAssignments,
    canExecute: isPending && !hasAssignments,
    canFinalize: isPending && hasAssignments,
    canNotify: isFinalized,
    canDelete: isPending,
    canViewResults: hasAssignments,
    lifecycleStep,
    isNotified,
  };
}

export function exportToCSV(
  assignments: AssignmentWithNames[],
  drawId: string
): void {
  const headers = ['Giver', 'Receiver'];
  const rows = assignments.map((a) => [a.giver_name, a.receiver_name]);

  const csvContent = [
    headers.join(','),
    ...rows.map((row) => row.join(',')),
  ].join('\n');

  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const link = document.createElement('a');
  const url = URL.createObjectURL(blob);

  link.setAttribute('href', url);
  link.setAttribute('download', `draw-${drawId}-results.csv`);
  link.style.visibility = 'hidden';

  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}

export async function copyToClipboard(
  assignments: AssignmentWithNames[],
  groupName?: string
): Promise<void> {
  const text = [
    `Draw Results${groupName ? ` - ${groupName}` : ''}`,
    '',
    ...assignments.map((a) => `${a.giver_name} → ${a.receiver_name}`),
  ].join('\n');

  if (navigator.clipboard) {
    await navigator.clipboard.writeText(text);
  } else {
    const textArea = document.createElement('textarea');
    textArea.value = text;
    document.body.appendChild(textArea);
    textArea.select();
    document.execCommand('copy');
    document.body.removeChild(textArea);
  }
}

export function shouldShowConfetti(drawId: string): boolean {
  if (typeof window === 'undefined') return false;

  const hasReducedMotion = window.matchMedia(
    '(prefers-reduced-motion: reduce)'
  ).matches;
  if (hasReducedMotion) return false;

  const flag = sessionStorage.getItem(`draw-${drawId}-just-finalized`);
  return flag === 'true';
}

export function clearConfettiFlag(drawId: string): void {
  if (typeof window !== 'undefined') {
    sessionStorage.removeItem(`draw-${drawId}-just-finalized`);
  }
}
