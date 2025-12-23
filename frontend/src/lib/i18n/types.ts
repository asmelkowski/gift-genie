import 'react-i18next';

declare module 'react-i18next' {
  interface CustomTypeOptions {
    defaultNS: 'common';
    resources: {
      common: typeof import('@/locales/en/common.json');
      auth: typeof import('@/locales/en/auth.json');
      groups: typeof import('@/locales/en/groups.json');
      members: typeof import('@/locales/en/members.json');
      draws: typeof import('@/locales/en/draws.json');
      exclusions: typeof import('@/locales/en/exclusions.json');
      admin: typeof import('@/locales/en/admin.json');
      errors: typeof import('@/locales/en/errors.json');
    };
  }
}
