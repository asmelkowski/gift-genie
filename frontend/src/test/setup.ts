import '@testing-library/jest-dom';
import { afterEach, vi, beforeAll, afterAll } from 'vitest';
import { cleanup } from '@testing-library/react';
import { server } from './mocks/server';

// Start server before all tests
beforeAll(() => {
  server.listen({ onUnhandledRequest: 'error' });
});

// Reset handlers and cleanup after each test
afterEach(() => {
  // Clean up React Testing Library DOM - this unmounts components
  cleanup();

  // Reset all MSW handlers for next test
  server.resetHandlers();

  // Clear all mocks
  vi.clearAllMocks();
});

// Clean up after all tests
afterAll(() => {
  server.close();
});

// Mock window.matchMedia
Object.defineProperty(window, 'matchMedia', {
  writable: true,
  value: vi.fn().mockImplementation(query => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: vi.fn(),
    removeListener: vi.fn(),
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    dispatchEvent: vi.fn(),
  })),
});

// Mock localStorage
const localStorageMock = {
  getItem: vi.fn(),
  setItem: vi.fn(),
  removeItem: vi.fn(),
  clear: vi.fn(),
  length: 0,
  key: vi.fn(),
} as Storage;
global.localStorage = localStorageMock;

// Import translation resources for the mock
import commonEn from '../locales/en/common.json';
import authEn from '../locales/en/auth.json';
import groupsEn from '../locales/en/groups.json';
import membersEn from '../locales/en/members.json';
import drawsEn from '../locales/en/draws.json';
import exclusionsEn from '../locales/en/exclusions.json';
import adminEn from '../locales/en/admin.json';
import errorsEn from '../locales/en/errors.json';

const resources = {
  common: commonEn,
  auth: authEn,
  groups: groupsEn,
  members: membersEn,
  draws: drawsEn,
  exclusions: exclusionsEn,
  admin: adminEn,
  errors: errorsEn,
} as const;

// Mock react-i18next
vi.mock('react-i18next', () => {
  return {
    useTranslation: (ns?: string | string[]) => {
      const defaultNs = Array.isArray(ns) ? ns[0] : ns || 'common';

      return {
        t: (key: string, options?: Record<string, unknown>) => {
          let namespace = defaultNs;
          let actualKey = key;

          if (key.includes(':')) {
            [namespace, actualKey] = key.split(':');
          }

          const nsResource = resources[namespace as keyof typeof resources];
          if (!nsResource) return key;

          // Simple nested key lookup (e.g., 'login.emailLabel')
          const parts = actualKey.split('.');
          let value: unknown = nsResource;
          for (const part of parts) {
            value = (value as Record<string, unknown>)?.[part];
          }

          if (typeof value === 'string') {
            let result = value;
            // Very basic interpolation for {{name}} etc.
            if (options) {
              Object.entries(options).forEach(([k, v]) => {
                result = result.replace(`{{${k}}}`, String(v));
              });
            }
            return result;
          }

          return key;
        },
        i18n: {
          changeLanguage: () => Promise.resolve(),
          language: 'en',
        },
      };
    },
    initReactI18next: {
      type: '3rdParty',
      init: () => {},
    },
    Trans: ({ children }: { children: React.ReactNode }) => children,
  };
});
