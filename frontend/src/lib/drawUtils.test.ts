import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import {
  formatDrawTimestamp,
  transformToDrawViewModel,
  exportToCSV,
  copyToClipboard,
  shouldShowConfetti,
  clearConfettiFlag,
  type AssignmentWithNames,
} from './drawUtils';
import type { components } from '@/types/schema';

type DrawResponse = components['schemas']['DrawResponse'];

// Create a mock DrawResponse
const createMockDraw = (overrides: Partial<DrawResponse> = {}): DrawResponse => ({
  id: 'draw-1',
  group_id: 'group-1',
  name: 'Test Draw',
  status: 'pending',
  assignments_count: 0,
  created_at: '2024-10-22T10:00:00Z',
  finalized_at: null,
  notification_sent_at: null,
  updated_at: '2024-10-22T10:00:00Z',
  ...overrides,
});

describe('drawUtils', () => {
  describe('formatDrawTimestamp', () => {
    it('formats date correctly for en-US locale', () => {
      const timestamp = '2024-10-22T14:30:00Z';
      const result = formatDrawTimestamp(timestamp);

      // Verify it returns a non-empty string
      expect(result).toBeTruthy();
      expect(typeof result).toBe('string');
      // Verify it contains time with AM/PM
      expect(result).toMatch(/\d{1,2}:\d{2}\s*(AM|PM)/i);
    });

    it('returns valid date string when passed valid date string', () => {
      const timestamp = '2024-01-15T09:45:30Z';
      const result = formatDrawTimestamp(timestamp);

      expect(result).toBeTruthy();
      expect(typeof result).toBe('string');
    });

    it('handles different time formats', () => {
      const timestamps = [
        '2024-01-01T00:00:00Z',
        '2024-06-15T12:30:00Z',
        '2024-12-25T23:59:59Z',
      ];

      timestamps.forEach((ts) => {
        const result = formatDrawTimestamp(ts);
        expect(result).toBeTruthy();
        expect(typeof result).toBe('string');
        expect(result).toMatch(/\d{1,2}:\d{2}\s*(AM|PM)/i);
      });
    });
  });

  describe('transformToDrawViewModel', () => {
    it('maps pending draw with no assignments to "created" lifecycle', () => {
      const draw = createMockDraw({
        status: 'pending',
        assignments_count: 0,
      });

      const result = transformToDrawViewModel(draw);

      expect(result.lifecycleStep).toBe('created');
      expect(result.statusLabel).toBe('Pending');
      expect(result.statusColor).toBe('yellow');
    });

    it('maps pending draw with assignments to "executed" lifecycle', () => {
      const draw = createMockDraw({
        status: 'pending',
        assignments_count: 5,
      });

      const result = transformToDrawViewModel(draw);

      expect(result.lifecycleStep).toBe('executed');
      expect(result.hasAssignments).toBe(true);
    });

    it('maps finalized draw to "finalized" lifecycle', () => {
      const draw = createMockDraw({
        status: 'finalized',
        assignments_count: 5,
        finalized_at: '2024-10-22T15:00:00Z',
      });

      const result = transformToDrawViewModel(draw);

      expect(result.lifecycleStep).toBe('finalized');
      expect(result.statusLabel).toBe('Finalized');
      expect(result.statusColor).toBe('green');
    });

    it('maps draw with notification_sent_at to "notified" lifecycle', () => {
      const draw = createMockDraw({
        status: 'finalized',
        assignments_count: 5,
        finalized_at: '2024-10-22T15:00:00Z',
        notification_sent_at: '2024-10-22T16:00:00Z',
      });

      const result = transformToDrawViewModel(draw);

      expect(result.lifecycleStep).toBe('notified');
      expect(result.isNotified).toBe(true);
    });

    it('correctly sets canExecute for pending draw without assignments', () => {
      const draw = createMockDraw({
        status: 'pending',
        assignments_count: 0,
      });

      const result = transformToDrawViewModel(draw);

      expect(result.canExecute).toBe(true);
      expect(result.canFinalize).toBe(false);
      expect(result.canNotify).toBe(false);
      expect(result.canDelete).toBe(true);
    });

    it('correctly sets canFinalize for pending draw with assignments', () => {
      const draw = createMockDraw({
        status: 'pending',
        assignments_count: 5,
      });

      const result = transformToDrawViewModel(draw);

      expect(result.canExecute).toBe(false);
      expect(result.canFinalize).toBe(true);
      expect(result.canNotify).toBe(false);
      expect(result.canDelete).toBe(true);
    });

    it('correctly sets canNotify for finalized draw', () => {
      const draw = createMockDraw({
        status: 'finalized',
        assignments_count: 5,
        finalized_at: '2024-10-22T15:00:00Z',
      });

      const result = transformToDrawViewModel(draw);

      expect(result.canExecute).toBe(false);
      expect(result.canFinalize).toBe(false);
      expect(result.canNotify).toBe(true);
      expect(result.canDelete).toBe(false);
    });

    it('formats timestamp fields correctly', () => {
      const draw = createMockDraw({
        status: 'finalized',
        created_at: '2024-10-22T10:00:00Z',
        finalized_at: '2024-10-22T15:00:00Z',
        notification_sent_at: '2024-10-22T16:00:00Z',
      });

      const result = transformToDrawViewModel(draw);

      expect(result.formattedCreatedAt).toBeTruthy();
      expect(result.formattedFinalizedAt).toBeTruthy();
      expect(result.formattedNotificationSentAt).toBeTruthy();
    });

    it('sets formattedFinalizedAt to null when finalized_at is null', () => {
      const draw = createMockDraw({
        finalized_at: null,
      });

      const result = transformToDrawViewModel(draw);

      expect(result.formattedFinalizedAt).toBeNull();
    });

    it('sets canViewResults to true when assignments exist', () => {
      const draw = createMockDraw({
        assignments_count: 5,
      });

      const result = transformToDrawViewModel(draw);

      expect(result.canViewResults).toBe(true);
    });

    it('sets canViewResults to false when no assignments', () => {
      const draw = createMockDraw({
        assignments_count: 0,
      });

      const result = transformToDrawViewModel(draw);

      expect(result.canViewResults).toBe(false);
    });
  });

  describe('exportToCSV', () => {
    let mockAppendChild: jest.SpyInstance;
    let mockRemoveChild: jest.SpyInstance;
    let mockLink: HTMLElement;

    beforeEach(() => {
      mockLink = {
        setAttribute: vi.fn(),
        click: vi.fn(),
        style: {},
      };

      vi.spyOn(document, 'createElement').mockReturnValue(mockLink);
      mockAppendChild = vi.spyOn(document.body, 'appendChild').mockImplementation(() => {});
      mockRemoveChild = vi.spyOn(document.body, 'removeChild').mockImplementation(() => {});
      vi.stubGlobal('URL', {
        createObjectURL: vi.fn(() => 'blob:mock-url'),
      });
    });

    afterEach(() => {
      vi.restoreAllMocks();
    });

    it('creates link element with correct download filename', () => {
      const assignments = [
        {
          id: '1',
          draw_id: 'draw-123',
          giver_member_id: 'member-1',
          receiver_member_id: 'member-2',
          giver_name: 'Alice',
          receiver_name: 'Bob',
          created_at: '2024-10-22T10:00:00Z',
        },
      ];

      exportToCSV(assignments, 'draw-123');

      expect(mockLink.setAttribute).toHaveBeenCalledWith('download', 'draw-draw-123-results.csv');
      expect(mockLink.click).toHaveBeenCalled();
    });

    it('appends and removes link from document', () => {
      const assignments = [
        {
          id: '1',
          draw_id: 'draw-1',
          giver_member_id: 'member-1',
          receiver_member_id: 'member-2',
          giver_name: 'Alice',
          receiver_name: 'Bob',
          created_at: '2024-10-22T10:00:00Z',
        },
      ];

      exportToCSV(assignments, 'draw-1');

      expect(mockAppendChild).toHaveBeenCalledWith(mockLink);
      expect(mockRemoveChild).toHaveBeenCalledWith(mockLink);
    });

    it('handles empty assignments list', () => {
      const assignments: AssignmentWithNames[] = [];

      exportToCSV(assignments, 'draw-1');

      expect(mockLink.click).toHaveBeenCalled();
    });
  });

  describe('copyToClipboard', () => {
    beforeEach(() => {
      vi.clearAllMocks();
    });

    afterEach(() => {
      vi.restoreAllMocks();
    });

    it('uses navigator.clipboard when available', async () => {
      const mockWriteText = vi.fn().mockResolvedValue(undefined);
      vi.stubGlobal('navigator', {
        clipboard: {
          writeText: mockWriteText,
        },
      } as Navigator);

      const assignments = [
        {
          id: '1',
          draw_id: 'draw-1',
          giver_member_id: 'member-1',
          receiver_member_id: 'member-2',
          giver_name: 'Alice',
          receiver_name: 'Bob',
          created_at: '2024-10-22T10:00:00Z',
        },
      ];

      await copyToClipboard(assignments);

      expect(mockWriteText).toHaveBeenCalledWith(expect.stringContaining('Alice → Bob'));
    });

    it('includes group name in clipboard text when provided', async () => {
      const mockWriteText = vi.fn().mockResolvedValue(undefined);
      vi.stubGlobal('navigator', {
        clipboard: {
          writeText: mockWriteText,
        },
      } as Navigator);

      const assignments = [
        {
          id: '1',
          draw_id: 'draw-1',
          giver_member_id: 'member-1',
          receiver_member_id: 'member-2',
          giver_name: 'Alice',
          receiver_name: 'Bob',
          created_at: '2024-10-22T10:00:00Z',
        },
      ];

      await copyToClipboard(assignments, 'My Group');

      expect(mockWriteText).toHaveBeenCalledWith(expect.stringContaining('Draw Results - My Group'));
    });

    it('formats clipboard text correctly with multiple assignments', async () => {
      const mockWriteText = vi.fn().mockResolvedValue(undefined);
      vi.stubGlobal('navigator', {
        clipboard: {
          writeText: mockWriteText,
        },
      } as Navigator);

      const assignments = [
        {
          id: '1',
          draw_id: 'draw-1',
          giver_member_id: 'member-1',
          receiver_member_id: 'member-2',
          giver_name: 'Alice',
          receiver_name: 'Bob',
          created_at: '2024-10-22T10:00:00Z',
        },
        {
          id: '2',
          draw_id: 'draw-1',
          giver_member_id: 'member-2',
          receiver_member_id: 'member-1',
          giver_name: 'Bob',
          receiver_name: 'Alice',
          created_at: '2024-10-22T10:00:00Z',
        },
      ];

      await copyToClipboard(assignments);

      const call = mockWriteText.mock.calls[0][0];
      expect(call).toContain('Alice → Bob');
      expect(call).toContain('Bob → Alice');
    });
  });

  describe('shouldShowConfetti', () => {
    beforeEach(() => {
      sessionStorage.clear();
      vi.clearAllMocks();
    });

    it('returns false when prefers-reduced-motion is set', () => {
      vi.stubGlobal('window', {
        ...window,
        matchMedia: vi.fn(() => ({
          matches: true,
          media: '(prefers-reduced-motion: reduce)',
          onchange: null,
          addListener: vi.fn(),
          removeListener: vi.fn(),
          addEventListener: vi.fn(),
          removeEventListener: vi.fn(),
          dispatchEvent: vi.fn(),
        })) as MediaQueryList,
      });

      const result = shouldShowConfetti('draw-1');

      expect(result).toBe(false);
    });

    it('returns true when flag is set in sessionStorage and no reduced motion', () => {
      vi.stubGlobal('window', {
        ...window,
        matchMedia: vi.fn(() => ({
          matches: false,
          media: '(prefers-reduced-motion: reduce)',
          onchange: null,
          addListener: vi.fn(),
          removeListener: vi.fn(),
          addEventListener: vi.fn(),
          removeEventListener: vi.fn(),
          dispatchEvent: vi.fn(),
        })) as MediaQueryList,
      });

      sessionStorage.setItem('draw-draw-1-just-finalized', 'true');

      const result = shouldShowConfetti('draw-1');

      expect(result).toBe(true);
    });

    it('returns false when flag is not in sessionStorage', () => {
      vi.stubGlobal('window', {
        ...window,
        matchMedia: vi.fn(() => ({
          matches: false,
          media: '(prefers-reduced-motion: reduce)',
          onchange: null,
          addListener: vi.fn(),
          removeListener: vi.fn(),
          addEventListener: vi.fn(),
          removeEventListener: vi.fn(),
          dispatchEvent: vi.fn(),
        })) as MediaQueryList,
      });

      const result = shouldShowConfetti('draw-1');

      expect(result).toBe(false);
    });

    it('returns false when flag is set to "false" string', () => {
      vi.stubGlobal('window', {
        ...window,
        matchMedia: vi.fn(() => ({
          matches: false,
          media: '(prefers-reduced-motion: reduce)',
          onchange: null,
          addListener: vi.fn(),
          removeListener: vi.fn(),
          addEventListener: vi.fn(),
          removeEventListener: vi.fn(),
          dispatchEvent: vi.fn(),
        })) as MediaQueryList,
      });

      sessionStorage.setItem('draw-draw-1-just-finalized', 'false');

      const result = shouldShowConfetti('draw-1');

      expect(result).toBe(false);
    });
  });

  describe('clearConfettiFlag', () => {
    beforeEach(() => {
      sessionStorage.clear();
    });

    it('removes flag from sessionStorage', () => {
      const drawId = 'draw-1';
      sessionStorage.setItem(`draw-${drawId}-just-finalized`, 'true');

      expect(sessionStorage.getItem(`draw-${drawId}-just-finalized`)).toBe('true');

      clearConfettiFlag(drawId);

      expect(sessionStorage.getItem(`draw-${drawId}-just-finalized`)).toBeNull();
    });

    it('handles clearing when flag does not exist', () => {
      const drawId = 'draw-2';

      expect(sessionStorage.getItem(`draw-${drawId}-just-finalized`)).toBeNull();

      clearConfettiFlag(drawId);

      expect(sessionStorage.getItem(`draw-${drawId}-just-finalized`)).toBeNull();
    });
  });
});
