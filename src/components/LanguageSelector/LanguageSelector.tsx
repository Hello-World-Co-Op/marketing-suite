import { useTranslation } from 'react-i18next';

interface Language {
  code: string;
  name: string;
  nativeName: string;
  flag: string;
}

const LANGUAGES: Language[] = [
  { code: 'en', name: 'English', nativeName: 'English', flag: '\u{1F1FA}\u{1F1F8}' },
  { code: 'es', name: 'Spanish', nativeName: 'Espa\u00F1ol', flag: '\u{1F1EA}\u{1F1F8}' },
  { code: 'fr', name: 'French', nativeName: 'Fran\u00E7ais', flag: '\u{1F1EB}\u{1F1F7}' },
  { code: 'pt', name: 'Portuguese', nativeName: 'Portugu\u00EAs', flag: '\u{1F1E7}\u{1F1F7}' },
];

interface LanguageSelectorProps {
  className?: string;
}

/**
 * Language Selector Component
 * Allows users to switch between available languages
 * Stores preference in localStorage via i18next
 */
export default function LanguageSelector({ className = '' }: LanguageSelectorProps) {
  const { i18n, t } = useTranslation('common');

  const handleLanguageChange = (event: React.ChangeEvent<HTMLSelectElement>) => {
    const newLang = event.target.value;
    i18n.changeLanguage(newLang);
  };

  return (
    <div className={`relative inline-block ${className}`}>
      <label htmlFor="language-selector" className="sr-only">
        {t('language_selector.label')}
      </label>
      <select
        id="language-selector"
        value={i18n.language}
        onChange={handleLanguageChange}
        className="
          appearance-none
          px-4 py-2 pr-10
          bg-white
          border border-slate-300
          rounded-lg
          text-slate-900
          font-medium
          cursor-pointer
          hover:bg-slate-50
          focus:outline-none
          focus:ring-2
          focus:ring-primary-600
          focus:border-transparent
          transition-colors
        "
        aria-label={t('aria_labels.select_language')}
      >
        {LANGUAGES.map((lang) => (
          <option key={lang.code} value={lang.code}>
            {lang.flag} {lang.nativeName}
          </option>
        ))}
      </select>

      {/* Custom dropdown arrow */}
      <div className="absolute inset-y-0 right-0 flex items-center pr-3 pointer-events-none">
        <svg
          className="w-4 h-4 text-slate-600"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </div>
    </div>
  );
}
