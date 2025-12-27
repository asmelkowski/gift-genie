import { useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { Globe } from 'lucide-react';
import { Button } from '@/components/ui/button';

const LANGUAGES = {
  en: { flag: '🇬🇧', code: 'EN' },
  pl: { flag: '🇵🇱', code: 'PL' },
} as const;

export function LanguageSwitcher() {
  const { i18n } = useTranslation();

  const currentLanguage = (i18n.language || 'pl') as keyof typeof LANGUAGES;
  const nextLanguage = currentLanguage === 'pl' ? 'en' : 'pl';
  const nextLangConfig = LANGUAGES[nextLanguage];

  const handleToggleLanguage = useCallback(() => {
    i18n.changeLanguage(nextLanguage);
  }, [i18n, nextLanguage]);

  return (
    <Button
      onClick={handleToggleLanguage}
      variant="ghost"
      size="sm"
      className="gap-2"
      title={`Switch to ${nextLanguage.toUpperCase()}`}
      data-testid="language-switcher"
    >
      <Globe className="size-4" />
      <span>
        {nextLangConfig.flag} {nextLangConfig.code}
      </span>
    </Button>
  );
}
