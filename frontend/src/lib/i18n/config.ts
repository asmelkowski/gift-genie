import i18next from 'i18next';
import LanguageDetector from 'i18next-browser-languagedetector';
import { initReactI18next } from 'react-i18next';

// Import translation resources
import commonEn from '@/locales/en/common.json';
import authEn from '@/locales/en/auth.json';
import groupsEn from '@/locales/en/groups.json';
import membersEn from '@/locales/en/members.json';
import drawsEn from '@/locales/en/draws.json';
import exclusionsEn from '@/locales/en/exclusions.json';
import adminEn from '@/locales/en/admin.json';
import errorsEn from '@/locales/en/errors.json';

import commonPl from '@/locales/pl/common.json';
import authPl from '@/locales/pl/auth.json';
import groupsPl from '@/locales/pl/groups.json';
import membersPl from '@/locales/pl/members.json';
import drawsPl from '@/locales/pl/draws.json';
import exclusionsPl from '@/locales/pl/exclusions.json';
import adminPl from '@/locales/pl/admin.json';
import errorsPl from '@/locales/pl/errors.json';

import commonDe from '@/locales/de/common.json';
import authDe from '@/locales/de/auth.json';
import groupsDe from '@/locales/de/groups.json';
import membersDe from '@/locales/de/members.json';
import drawsDe from '@/locales/de/draws.json';
import exclusionsDe from '@/locales/de/exclusions.json';
import adminDe from '@/locales/de/admin.json';
import errorsDe from '@/locales/de/errors.json';

const resources = {
  en: {
    common: commonEn,
    auth: authEn,
    groups: groupsEn,
    members: membersEn,
    draws: drawsEn,
    exclusions: exclusionsEn,
    admin: adminEn,
    errors: errorsEn,
  },
  pl: {
    common: commonPl,
    auth: authPl,
    groups: groupsPl,
    members: membersPl,
    draws: drawsPl,
    exclusions: exclusionsPl,
    admin: adminPl,
    errors: errorsPl,
  },
  de: {
    common: commonDe,
    auth: authDe,
    groups: groupsDe,
    members: membersDe,
    draws: drawsDe,
    exclusions: exclusionsDe,
    admin: adminDe,
    errors: errorsDe,
  },
};

i18next
  .use(LanguageDetector)
  .use(initReactI18next)
  .init({
    resources,
    fallbackLng: 'pl',
    defaultNS: 'common',
    ns: ['common', 'auth', 'groups', 'members', 'draws', 'exclusions', 'admin', 'errors'],
    interpolation: {
      escapeValue: false,
    },
    detection: {
      order: ['localStorage', 'navigator'],
      caches: ['localStorage'],
      lookupLocalStorage: 'i18nextLng',
    },
    react: {
      useSuspense: false,
    },
  });

export default i18next;
