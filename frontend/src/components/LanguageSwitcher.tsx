import { useCallback, useState, useRef, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { Globe, Check, ChevronDown } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

const LANGUAGES = {
  en: { label: 'English', flag: '🇬🇧', code: 'EN' },
  pl: { label: 'Polski', flag: '🇵🇱', code: 'PL' },
  de: { label: 'Deutsch', flag: '🇩🇪', code: 'DE' },
} as const;

export function LanguageSwitcher() {
  const { i18n, t } = useTranslation('common');
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const currentLanguage = (i18n.language?.split('-')[0] || 'pl') as keyof typeof LANGUAGES;
  const currentLangConfig = LANGUAGES[currentLanguage] || LANGUAGES.pl;

  const handleLanguageChange = useCallback(
    (lang: keyof typeof LANGUAGES) => {
      i18n.changeLanguage(lang);
      setIsOpen(false);
    },
    [i18n]
  );

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen]);

  return (
    <div className="relative" ref={dropdownRef}>
      <Button
        onClick={() => setIsOpen(!isOpen)}
        variant="ghost"
        size="sm"
        className={cn(
          'gap-2 transition-colors duration-200',
          isOpen && 'bg-accent text-accent-foreground'
        )}
        title={t('appLayout.changeLanguage')}
        data-testid="language-switcher"
      >
        <Globe className="size-4" />
        <span className="font-medium">
          {currentLangConfig.flag} {currentLangConfig.code}
        </span>
        <ChevronDown
          className={cn('size-3 transition-transform duration-200', isOpen && 'rotate-180')}
        />
      </Button>

      {isOpen && (
        <div
          className="absolute right-0 mt-2 w-48 overflow-hidden rounded-xl border border-border bg-popover/95 p-1 text-popover-foreground shadow-xl backdrop-blur-sm animate-in fade-in zoom-in-95 duration-200 z-50"
          role="menu"
        >
          {Object.entries(LANGUAGES).map(([code, config]) => {
            const isSelected = currentLanguage === code;
            return (
              <button
                key={code}
                onClick={() => handleLanguageChange(code as keyof typeof LANGUAGES)}
                className={cn(
                  'flex w-full items-center gap-3 rounded-lg px-3 py-2 text-sm transition-all duration-200',
                  'hover:bg-accent hover:text-accent-foreground',
                  isSelected ? 'bg-accent/50 font-medium' : 'text-muted-foreground'
                )}
                role="menuitem"
              >
                <span className="text-lg leading-none">{config.flag}</span>
                <span className="flex-1 text-left">{config.label}</span>
                {isSelected && <Check className="size-4 text-primary" />}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
