# Localization Implementation Plan for Gift Genie

## Overview
This plan implements comprehensive localization (i18n) for Gift Genie with Polish as the primary language, English as secondary, and support for future languages. Uses browser detection with user override stored in localStorage (no backend storage needed initially).

---

## Target Architecture

### Frontend
- **Library**: `react-i18next` + `i18next`
- **Detection**: Browser language detection with localStorage override
- **Storage**: JSON translation files organized by namespace
- **Language Switcher**: User menu component
- **Type Safety**: TypeScript definitions for translation keys

### Backend
- **Email Templates**: Language-specific HTML templates using Jinja2
- **API Headers**: Accept `Accept-Language` header for email language selection
- **Structure**: Template files organized by language code

---

## Phase 1: Frontend Foundation

### 1.1 Install Dependencies

```bash
cd frontend
npm install i18next react-i18next i18next-browser-languagedetector
npm install --save-dev @types/i18next
```

### 1.2 Create Translation File Structure

Create the following directory structure:

```
frontend/src/
  locales/
    en/
      common.json          # Shared UI strings (buttons, labels, etc.)
      auth.json            # Login, Register pages
      groups.json          # Groups list and detail pages
      members.json         # Members page
      draws.json           # Draws page
      exclusions.json      # Exclusions page
      admin.json           # Admin dashboard
      errors.json          # Error messages
    pl/
      common.json
      auth.json
      groups.json
      members.json
      draws.json
      exclusions.json
      admin.json
      errors.json
  lib/
    i18n/
      config.ts            # i18next configuration
      types.ts             # TypeScript definitions
```

### 1.3 i18next Configuration

**File: `frontend/src/lib/i18n/config.ts`**

```typescript
import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import LanguageDetector from 'i18next-browser-languagedetector';

// Import translations
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
} as const;

i18n
  .use(LanguageDetector)
  .use(initReactI18next)
  .init({
    resources,
    fallbackLng: 'pl',
    defaultNS: 'common',
    ns: ['common', 'auth', 'groups', 'members', 'draws', 'exclusions', 'admin', 'errors'],

    interpolation: {
      escapeValue: false, // React already escapes
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

export default i18n;
```

**File: `frontend/src/lib/i18n/types.ts`**

```typescript
import 'react-i18next';
import { resources } from './config';

declare module 'react-i18next' {
  interface CustomTypeOptions {
    defaultNS: 'common';
    resources: typeof resources.en;
  }
}
```

### 1.4 Initialize i18n in App

**File: `frontend/src/main.tsx`** (update)

```typescript
import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import './index.css';
import App from './App.tsx';
import './lib/i18n/config'; // Add this line

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>
);
```

### 1.5 Create Language Switcher Component

**File: `frontend/src/components/LanguageSwitcher.tsx`**

```typescript
import { useTranslation } from 'react-i18next';
import { Button } from './ui/button';
import { Globe } from 'lucide-react';

const languages = [
  { code: 'pl', name: 'Polski', flag: '🇵🇱' },
  { code: 'en', name: 'English', flag: '🇬🇧' },
] as const;

export function LanguageSwitcher() {
  const { i18n } = useTranslation();

  const currentLanguage = languages.find(lang => lang.code === i18n.language) || languages[0];

  const toggleLanguage = () => {
    const currentIndex = languages.findIndex(lang => lang.code === i18n.language);
    const nextIndex = (currentIndex + 1) % languages.length;
    i18n.changeLanguage(languages[nextIndex].code);
  };

  return (
    <Button
      variant="ghost"
      size="sm"
      onClick={toggleLanguage}
      className="flex items-center gap-2"
      title={`Current: ${currentLanguage.name}`}
    >
      <Globe className="h-4 w-4" />
      <span>{currentLanguage.flag}</span>
      <span className="hidden sm:inline">{currentLanguage.code.toUpperCase()}</span>
    </Button>
  );
}
```

### 1.6 Add Language Switcher to UserMenu

Update `frontend/src/components/AppLayout/UserMenu.tsx` to include the language switcher in the dropdown.

---

## Phase 2: Translation Extraction & Files

### 2.1 Translation Key Naming Convention

Use hierarchical, descriptive keys:

```
namespace:section.element.variant

Examples:
common:actions.save
common:actions.cancel
common:actions.delete
common:labels.email
common:labels.password
common:labels.name
common:validation.required
common:validation.emailInvalid

auth:login.title
auth:login.emailLabel
auth:login.passwordLabel
auth:login.submitButton
auth:login.errors.invalidCredentials
auth:login.errors.tooManyAttempts
auth:register.title
auth:register.nameLabel

groups:list.title
groups:list.searchPlaceholder
groups:list.createButton
groups:list.empty.title
groups:list.empty.description
groups:detail.membersTab
groups:detail.drawsTab
```

### 2.2 Initial Translation Files

Create starter translation files for each namespace. Here's an example structure:

**File: `frontend/src/locales/pl/common.json`**

```json
{
  "actions": {
    "save": "Zapisz",
    "cancel": "Anuluj",
    "delete": "Usuń",
    "edit": "Edytuj",
    "create": "Utwórz",
    "search": "Szukaj",
    "filter": "Filtruj",
    "sort": "Sortuj",
    "back": "Wstecz",
    "next": "Dalej",
    "close": "Zamknij",
    "confirm": "Potwierdź",
    "retry": "Spróbuj ponownie"
  },
  "labels": {
    "email": "Email",
    "password": "Hasło",
    "name": "Imię",
    "description": "Opis",
    "createdAt": "Utworzono",
    "updatedAt": "Zaktualizowano"
  },
  "validation": {
    "required": "To pole jest wymagane",
    "emailInvalid": "Nieprawidłowy adres email",
    "passwordTooShort": "Hasło musi mieć co najmniej 8 znaków",
    "nameTooLong": "Nazwa jest zbyt długa (max {{max}} znaków)"
  },
  "status": {
    "loading": "Ładowanie...",
    "saving": "Zapisywanie...",
    "success": "Sukces!",
    "error": "Wystąpił błąd"
  },
  "pagination": {
    "previous": "Poprzednia",
    "next": "Następna",
    "page": "Strona {{current}} z {{total}}",
    "showing": "Pokazuje {{from}}-{{to}} z {{total}} wyników"
  }
}
```

**File: `frontend/src/locales/en/common.json`**

```json
{
  "actions": {
    "save": "Save",
    "cancel": "Cancel",
    "delete": "Delete",
    "edit": "Edit",
    "create": "Create",
    "search": "Search",
    "filter": "Filter",
    "sort": "Sort",
    "back": "Back",
    "next": "Next",
    "close": "Close",
    "confirm": "Confirm",
    "retry": "Retry"
  },
  "labels": {
    "email": "Email",
    "password": "Password",
    "name": "Name",
    "description": "Description",
    "createdAt": "Created",
    "updatedAt": "Updated"
  },
  "validation": {
    "required": "This field is required",
    "emailInvalid": "Invalid email address",
    "passwordTooShort": "Password must be at least 8 characters",
    "nameTooLong": "Name is too long (max {{max}} characters)"
  },
  "status": {
    "loading": "Loading...",
    "saving": "Saving...",
    "success": "Success!",
    "error": "An error occurred"
  },
  "pagination": {
    "previous": "Previous",
    "next": "Next",
    "page": "Page {{current}} of {{total}}",
    "showing": "Showing {{from}}-{{to}} of {{total}} results"
  }
}
```

### 2.3 Component Translation Examples

**Before (LoginForm.tsx):**
```typescript
<Label htmlFor="email">Email</Label>
```

**After:**
```typescript
import { useTranslation } from 'react-i18next';

// In component:
const { t } = useTranslation('auth');

<Label htmlFor="email">{t('login.emailLabel')}</Label>
```

**Full example for LoginForm:**

```typescript
const { t } = useTranslation('auth');

// Error handling:
if (status === 401) {
  setError(t('login.errors.invalidCredentials'));
} else if (status === 429) {
  setError(t('login.errors.tooManyAttempts'));
} else {
  setError(t('login.errors.unexpected'));
}

// Button text:
<Button type="submit">
  {loginMutation.isPending ? t('login.submitting') : t('login.submitButton')}
</Button>
```

---

## Phase 3: Backend Email Templates

### 3.1 Directory Structure

```
backend/src/gift_genie/
  infrastructure/
    templates/
      emails/
        en/
          assignment_notification.html
        pl/
          assignment_notification.html
```

### 3.2 Language Detection in Notification Service

**Update: `backend/src/gift_genie/domain/interfaces/notification_service.py`**

```python
from typing import Protocol


class NotificationService(Protocol):
    async def send_assignment_notification(
        self,
        member_email: str,
        member_name: str,
        receiver_name: str,
        group_name: str,
        language: str = "pl",  # Add language parameter
    ) -> bool:
        """Send Secret Santa assignment notification email.

        Args:
            member_email: Email address of the recipient
            member_name: Name of the giver
            receiver_name: Name of the receiver
            group_name: Name of the group
            language: Language code (en, pl, etc.)

        Returns:
            True if sent successfully, False otherwise
        """
        ...
```

### 3.3 Template Loader Service

**New File: `backend/src/gift_genie/infrastructure/services/template_loader.py`**

```python
from pathlib import Path
from jinja2 import Environment, FileSystemLoader, Template, TemplateNotFound


class TemplateLoader:
    """Load email templates with language support."""

    def __init__(self, templates_dir: Path | str):
        self.templates_dir = Path(templates_dir)
        self.env = Environment(
            loader=FileSystemLoader(self.templates_dir),
            autoescape=True,
        )

    def get_template(self, template_name: str, language: str = "pl") -> Template:
        """Get template for specified language with fallback.

        Args:
            template_name: Template file name (e.g., 'assignment_notification.html')
            language: Language code (e.g., 'pl', 'en')

        Returns:
            Jinja2 Template instance

        Raises:
            TemplateNotFound: If template doesn't exist in any language
        """
        # Try requested language first
        lang_path = f"emails/{language}/{template_name}"
        try:
            return self.env.get_template(lang_path)
        except TemplateNotFound:
            pass

        # Fallback to Polish (primary language)
        if language != "pl":
            fallback_path = f"emails/pl/{template_name}"
            try:
                return self.env.get_template(fallback_path)
            except TemplateNotFound:
                pass

        # Last resort: English
        if language != "en":
            fallback_path = f"emails/en/{template_name}"
            return self.env.get_template(fallback_path)

        raise TemplateNotFound(f"Template {template_name} not found for any language")
```

### 3.4 Update Email Notification Service

**Update: `backend/src/gift_genie/infrastructure/services/email_notification_service.py`**

```python
import logging
from pathlib import Path

from gift_genie.domain.interfaces.notification_service import NotificationService
from gift_genie.infrastructure.services.template_loader import TemplateLoader

logger = logging.getLogger(__name__)


class EmailNotificationService(NotificationService):
    """Email notification service with multi-language support.

    Currently logs to console (MVP). In production, renders templates and sends via SMTP.
    """

    def __init__(self):
        templates_dir = Path(__file__).parent.parent / "templates"
        self.template_loader = TemplateLoader(templates_dir)

    async def send_assignment_notification(
        self,
        member_email: str,
        member_name: str,
        receiver_name: str,
        group_name: str,
        language: str = "pl",
    ) -> bool:
        """Send Secret Santa assignment notification.

        Args:
            member_email: Email address of the giver
            member_name: Name of the giver
            receiver_name: Name of the receiver
            group_name: Name of the group
            language: Language code for email template

        Returns:
            True if "sent" successfully (always for stub), False otherwise
        """
        try:
            # Load and render template
            template = self.template_loader.get_template(
                "assignment_notification.html",
                language
            )
            email_body = template.render(
                member_name=member_name,
                receiver_name=receiver_name,
                group_name=group_name,
            )

            # Log the notification (would send via SMTP in production)
            logger.info(
                f"NOTIFICATION [{language.upper()}]: {member_name} ({member_email}) "
                f"assigned to {receiver_name} in '{group_name}'"
            )
            logger.debug(f"Email body preview: {email_body[:200]}...")

            # In production:
            # await self.smtp_client.send_email(
            #     to=member_email,
            #     subject=self._get_subject(language, group_name),
            #     html_body=email_body,
            # )

            return True

        except Exception as e:
            logger.error(f"Failed to send notification to {member_email}: {e}")
            return False

    def _get_subject(self, language: str, group_name: str) -> str:
        """Get localized email subject."""
        subjects = {
            "pl": f"Wynik losowania Tajemniczego Gwiazdora - {group_name}",
            "en": f"Secret Santa Draw Result - {group_name}",
        }
        return subjects.get(language, subjects["pl"])
```

### 3.5 Email Templates

**File: `backend/src/gift_genie/infrastructure/templates/emails/pl/assignment_notification.html`**

Move existing `default_email_template.html` here and update placeholders:

```html
<!DOCTYPE html>
<html lang="pl">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Wynik Losowania Tajemniczego Gwiazdora - {{ group_name }}</title>
    <style>
        body {
            font-family: Arial, sans-serif;
            line-height: 1.6;
            color: #333;
            max-width: 600px;
            margin: 0 auto;
            padding: 20px;
            background-color: #f0f0f0;
        }
        .container {
            background-color: #ffffff;
            border-radius: 5px;
            padding: 30px;
            box-shadow: 0 2px 5px rgba(0, 0, 0, 0.1);
        }
        h1 {
            color: #d42426;
            text-align: center;
        }
        .result {
            font-size: 18px;
            font-weight: bold;
            text-align: center;
            margin: 20px 0;
            padding: 15px;
            background-color: #e8f5e9;
            border-radius: 5px;
        }
        .signature {
            text-align: right;
            margin-top: 30px;
            font-style: italic;
        }
    </style>
</head>
<body>
    <div class="container">
        <h1>🎅 Wynik Losowania Tajemniczego Gwiazdora 🎄</h1>

        <p>Cześć {{ member_name }}!</p>

        <p>Okres świąteczny jest tuż za rogiem, a wraz z nim nadszedł czas na naszą ekscytującą wymianę prezentów w ramach zabawy w Tajemniczego Gwiazdora w grupie <strong>{{ group_name }}</strong>!</p>

        <p>Z radością ogłaszamy wynik Twojego losowania:</p>

        <div class="result">
            Osoba, dla której przygotowujesz prezent to: {{ receiver_name }}
        </div>

        <p>Pamiętaj, aby zachować to w tajemnicy i dobrze się bawić, wybierając przemyślany prezent.</p>

        <p>W miarę zbliżania się tego radosnego czasu, życzymy Tobie i Twoim bliskim wspaniałego okresu świątecznego, pełnego ciepła, śmiechu i niezapomnianych chwil. Niech magia Świąt Bożego Narodzenia przyniesie Ci spokój, radość i szczęście.</p>

        <p>Udanych zakupów i Wesołych Świąt!</p>

        <div class="signature">
            Najlepsze życzenia,<br>
            Zespół Gift-Genie
        </div>
    </div>
</body>
</html>
```

**File: `backend/src/gift_genie/infrastructure/templates/emails/en/assignment_notification.html`**

```html
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Secret Santa Draw Result - {{ group_name }}</title>
    <style>
        body {
            font-family: Arial, sans-serif;
            line-height: 1.6;
            color: #333;
            max-width: 600px;
            margin: 0 auto;
            padding: 20px;
            background-color: #f0f0f0;
        }
        .container {
            background-color: #ffffff;
            border-radius: 5px;
            padding: 30px;
            box-shadow: 0 2px 5px rgba(0, 0, 0, 0.1);
        }
        h1 {
            color: #d42426;
            text-align: center;
        }
        .result {
            font-size: 18px;
            font-weight: bold;
            text-align: center;
            margin: 20px 0;
            padding: 15px;
            background-color: #e8f5e9;
            border-radius: 5px;
        }
        .signature {
            text-align: right;
            margin-top: 30px;
            font-style: italic;
        }
    </style>
</head>
<body>
    <div class="container">
        <h1>🎅 Secret Santa Draw Result 🎄</h1>

        <p>Hi {{ member_name }}!</p>

        <p>The holiday season is just around the corner, and it's time for our exciting gift exchange as part of the Secret Santa game in the <strong>{{ group_name }}</strong> group!</p>

        <p>We're excited to announce your draw result:</p>

        <div class="result">
            The person you'll be giving a gift to is: {{ receiver_name }}
        </div>

        <p>Remember to keep this a secret and have fun choosing a thoughtful gift.</p>

        <p>As this joyful time approaches, we wish you and your loved ones a wonderful holiday season filled with warmth, laughter, and unforgettable moments. May the magic of Christmas bring you peace, joy, and happiness.</p>

        <p>Happy shopping and Merry Christmas!</p>

        <div class="signature">
            Best wishes,<br>
            The Gift-Genie Team
        </div>
    </div>
</body>
</html>
```

### 3.6 Update Use Cases to Pass Language

Use cases that trigger notifications need to determine the language. For browser-based actions, extract from `Accept-Language` header:

**Update: `backend/src/gift_genie/presentation/api/dependencies.py`** (add helper)

```python
from fastapi import Request


def get_preferred_language(request: Request) -> str:
    """Extract preferred language from Accept-Language header.

    Returns:
        Language code (e.g., 'pl', 'en'), defaults to 'pl'
    """
    accept_language = request.headers.get("Accept-Language", "")

    # Parse Accept-Language header (e.g., "pl-PL,pl;q=0.9,en-US;q=0.8,en;q=0.7")
    if not accept_language:
        return "pl"

    # Get first language code
    parts = accept_language.split(",")[0].split("-")[0].strip().lower()

    # Validate against supported languages
    supported = {"pl", "en"}
    return parts if parts in supported else "pl"
```

Then update endpoints that trigger notifications to pass language parameter.

---

## Phase 4: Migration Strategy

### 4.1 Component Migration Approach

Migrate components in order of user visibility:

1. **High Priority** (user-facing):
   - LoginPage / LoginForm
   - RegisterPage / RegisterForm
   - GroupsPage
   - MembersPage
   - DrawsPage
   - ExclusionsPage

2. **Medium Priority**:
   - Navigation / AppLayout
   - Error states
   - Empty states
   - Dialogs and modals

3. **Low Priority**:
   - Admin dashboard
   - Tooltips
   - Validation messages

### 4.2 Component Migration Checklist

For each component:

- [ ] Import `useTranslation` hook
- [ ] Extract all hardcoded strings
- [ ] Create translation keys in appropriate namespace
- [ ] Add Polish translations
- [ ] Add English translations
- [ ] Test language switching
- [ ] Update component tests (mock i18n)

### 4.3 Testing Strategy

**Unit Tests:**
Mock i18next in tests:

```typescript
// In test file
vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string) => key,
    i18n: {
      language: 'en',
      changeLanguage: vi.fn(),
    },
  }),
}));
```

**E2E Tests:**
Add language switching tests:

```typescript
test('should switch language', async ({ page }) => {
  await page.goto('/app/groups');

  // Check default (Polish)
  await expect(page.getByRole('heading', { name: 'Grupy' })).toBeVisible();

  // Switch to English
  await page.getByRole('button', { name: /language/i }).click();

  // Verify English content
  await expect(page.getByRole('heading', { name: 'Groups' })).toBeVisible();
});
```

---

## Phase 5: Date/Time Localization

Update date formatting to respect user language:

**Before:**
```typescript
const formattedDate = new Date(createdAt).toLocaleDateString('en-US');
```

**After:**
```typescript
import { useTranslation } from 'react-i18next';

const { i18n } = useTranslation();
const formattedDate = new Date(createdAt).toLocaleDateString(i18n.language);
```

Create utility function:

**File: `frontend/src/lib/i18n/dateFormatter.ts`**

```typescript
export function formatDate(date: Date | string, locale: string = 'pl'): string {
  const dateObj = typeof date === 'string' ? new Date(date) : date;
  return dateObj.toLocaleDateString(locale, {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });
}

export function formatDateTime(date: Date | string, locale: string = 'pl'): string {
  const dateObj = typeof date === 'string' ? new Date(date) : date;
  return dateObj.toLocaleString(locale, {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}
```

---

## Implementation Phases Summary

### Phase 1: Frontend Setup (Day 1-2)
- Install dependencies
- Configure i18next
- Create translation file structure
- Build language switcher component
- Add to UserMenu

### Phase 2: Translation Files (Day 2-3)
- Define key naming convention
- Create initial translation files (Polish + English)
- Extract strings from high-priority components
- Implement `useTranslation` in components

### Phase 3: Backend Email (Day 3-4)
- Create template directory structure
- Build TemplateLoader service
- Update NotificationService interface
- Create Polish and English email templates
- Add language detection from headers

### Phase 4: Component Migration (Day 4-7)
- Migrate LoginForm
- Migrate RegisterForm
- Migrate GroupsPage
- Migrate MembersPage
- Migrate DrawsPage
- Migrate ExclusionsPage
- Update AppLayout components

### Phase 5: Polish & Testing (Day 7-8)
- Add date/time localization
- Write/update unit tests
- Add E2E tests for language switching
- Review all translations
- Test edge cases

---

## Risks & Mitigations

| Risk | Impact | Mitigation |
|------|--------|------------|
| Missing translation keys | Runtime errors | TypeScript validation, fallback to key name |
| Incomplete translations | Poor UX | Comprehensive review, translation checklist |
| Performance (bundle size) | Slow initial load | Already importing all - acceptable for 2 languages |
| Pluralization complexity | Incorrect grammar | Use i18next pluralization features |
| Test maintenance | Brittle tests | Mock i18next consistently, test key existence |

---

## Future Enhancements

1. **Lazy Loading**: Dynamically load language files to reduce bundle size
2. **Backend User Preference**: Store language in User entity for consistency
3. **More Languages**: Add German, French, Spanish, etc.
4. **Translation Management**: Integrate with Lokalise or Crowdin
5. **RTL Support**: Add right-to-left language support if needed
6. **Number/Currency**: Localize number formatting for pricing features

---

## Success Criteria

- ✅ Users can switch between Polish and English
- ✅ Language preference persists in localStorage
- ✅ All user-facing strings are translated
- ✅ Email templates render in correct language
- ✅ Dates format according to locale
- ✅ No hardcoded strings remain in components
- ✅ All tests pass with i18n
- ✅ E2E tests verify language switching works

---

## Open Questions for Implementation

1. Should we add language to URL params (`/pl/app/groups` vs `/en/app/groups`)?
2. Do you want to localize the backend API error messages returned to frontend?
3. Should we add a language parameter to the User entity for future consistency?
4. Do we need to support right-to-left (RTL) languages eventually?
