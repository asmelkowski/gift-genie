import { describe, it, expect, vi } from 'vitest';
import axios from 'axios';
import { isForbiddenError, isNotFoundError, getErrorMessage, isAxiosError } from './errors';

vi.mock('axios', async () => {
  const actual = await vi.importActual<typeof import('axios')>('axios');
  return {
    default: {
      ...(actual?.default as object),
      isAxiosError: vi.fn(),
    },
  };
});

describe('errors utilities', () => {
  describe('isAxiosError', () => {
    it('returns true for axios error objects', () => {
      vi.mocked(axios.isAxiosError).mockReturnValueOnce(true);
      expect(isAxiosError({ isAxiosError: true })).toBe(true);
    });

    it('returns false for regular errors', () => {
      vi.mocked(axios.isAxiosError).mockReturnValueOnce(false);
      const error = new Error('test');
      expect(isAxiosError(error)).toBe(false);
    });
  });

  describe('isForbiddenError', () => {
    it('returns true for 403 status', () => {
      vi.mocked(axios.isAxiosError).mockReturnValueOnce(true);
      const error = {
        response: { status: 403 },
      };
      expect(isForbiddenError(error)).toBe(true);
    });

    it('returns true for nested forbidden code in detail', () => {
      vi.mocked(axios.isAxiosError).mockReturnValueOnce(true);
      const error = {
        response: {
          status: 400,
          data: { detail: { code: 'forbidden' } },
        },
      };
      expect(isForbiddenError(error)).toBe(true);
    });

    it('returns false for other status codes', () => {
      vi.mocked(axios.isAxiosError).mockReturnValueOnce(true);
      const error = {
        response: { status: 404 },
      };
      expect(isForbiddenError(error)).toBe(false);
    });
  });

  describe('isNotFoundError', () => {
    it('returns true for 404 status', () => {
      vi.mocked(axios.isAxiosError).mockReturnValueOnce(true);
      const error = {
        response: { status: 404 },
      };
      expect(isNotFoundError(error)).toBe(true);
    });
  });

  describe('getErrorMessage', () => {
    it('extracts string detail from axios response', () => {
      vi.mocked(axios.isAxiosError).mockReturnValueOnce(true);
      const error = {
        response: {
          data: { detail: 'Permission denied' },
        },
      };
      expect(getErrorMessage(error)).toBe('Permission denied');
    });

    it('extracts nested message from detail object', () => {
      vi.mocked(axios.isAxiosError).mockReturnValueOnce(true);
      const error = {
        response: {
          data: {
            detail: {
              code: 'forbidden',
              message: "Permission 'groups:read' required",
            },
          },
        },
      };
      expect(getErrorMessage(error)).toBe("Permission 'groups:read' required");
    });

    it('extracts top-level message from axios response', () => {
      vi.mocked(axios.isAxiosError).mockReturnValueOnce(true);
      const error = {
        response: {
          data: { message: 'Server error occurred' },
        },
      };
      expect(getErrorMessage(error)).toBe('Server error occurred');
    });

    it('falls back to statusText', () => {
      vi.mocked(axios.isAxiosError).mockReturnValueOnce(true);
      const error = {
        response: {
          status: 403,
          statusText: 'Forbidden',
          data: {},
        },
      };
      expect(getErrorMessage(error)).toBe('Forbidden');
    });

    it('extracts message from regular Error', () => {
      vi.mocked(axios.isAxiosError).mockReturnValueOnce(false);
      const error = new Error('Something went wrong');
      expect(getErrorMessage(error)).toBe('Something went wrong');
    });
  });
});
