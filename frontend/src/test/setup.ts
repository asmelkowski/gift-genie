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

// Mock react-i18next
vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string) => {
      // Mock translations for common keys to match expected values in tests
      if (key === 'toolbar.sort.nameAZ') return 'Name (A-Z)';
      if (key === 'toolbar.sort.nameZA') return 'Name (Z-A)';
      if (key === 'toolbar.sort.newestFirst') return 'Newest First';
      if (key === 'toolbar.sort.oldestFirst') return 'Oldest First';
      if (key === 'toolbar.filterAll') return 'All';
      if (key === 'toolbar.filterActive') return 'Active';
      if (key === 'toolbar.filterInactive') return 'Inactive';
      if (key === 'toolbar.searchPlaceholder') return 'Search by name or email...';
      if (key === 'toolbar.clearSearchAriaLabel') return 'Clear search';
      return key;
    },
    i18n: {
      changeLanguage: () => Promise.resolve(),
      language: 'en',
    },
  }),
  initReactI18next: {
    type: '3rdParty',
    init: () => {},
  },
}));
