import React from 'react';
import { useTranslation, Trans } from 'react-i18next';

interface IntroSectionProps {
  onJoinWaitlist?: () => void;
  isFormOpen?: boolean;
}

/**
 * Intro Section - Opening pitch and mission statement
 */
export default function IntroSection({ onJoinWaitlist, isFormOpen }: IntroSectionProps) {
  const { t } = useTranslation('launch');

  return (
    <section className="space-y-6">
      <p className="text-lg leading-relaxed">{t('intro.opening')}</p>

      <p className="text-lg leading-relaxed">
        <Trans i18nKey="intro.blueprint" ns="launch" components={{ strong: <strong /> }} />
      </p>

      <p className="text-lg leading-relaxed">{t('intro.mission_intro')}</p>

      <ul className="space-y-3 text-lg list-disc list-inside ml-4">
        <li>{t('intro.goals.democratize')}</li>
        <li>{t('intro.goals.protect')}</li>
        <li>{t('intro.goals.solutions')}</li>
      </ul>

      <p className="text-lg leading-relaxed">{t('intro.cta_prompt')}</p>

      {onJoinWaitlist && (
        <div className="flex justify-center mt-8">
          <button
            onClick={onJoinWaitlist}
            className={`px-8 py-3 rounded-lg font-semibold transition-colors shadow-md hover:shadow-lg ${
              isFormOpen
                ? 'bg-gray-600 text-white hover:bg-gray-700'
                : 'bg-primary-700 text-white hover:bg-primary-800'
            }`}
          >
            {isFormOpen ? t('common:buttons.cancel') : t('intro.cta_button')}
          </button>
        </div>
      )}
    </section>
  );
}
