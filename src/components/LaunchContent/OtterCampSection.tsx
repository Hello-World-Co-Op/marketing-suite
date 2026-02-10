import React from 'react';
import { useTranslation, Trans } from 'react-i18next';

interface OtterCampSectionProps {
  onJoinWaitlist?: () => void;
  isFormOpen?: boolean;
}

/**
 * Otter Camp Platform Description
 */
export default function OtterCampSection({ onJoinWaitlist, isFormOpen }: OtterCampSectionProps) {
  const { t } = useTranslation('launch');

  return (
    <section className="space-y-6">
      <h2 className="text-2xl md:text-3xl font-bold text-slate-900">{t('otter_camp.heading')}</h2>

      <p className="text-lg leading-relaxed">{t('otter_camp.intro')}</p>

      <p className="text-lg leading-relaxed">{t('otter_camp.impact')}</p>

      <p className="text-lg leading-relaxed">
        <Trans i18nKey="otter_camp.token_intro" ns="launch" components={{ strong: <strong /> }} />
      </p>

      <p className="text-lg leading-relaxed">{t('otter_camp.token_value')}</p>

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
            {isFormOpen ? t('common:buttons.cancel') : t('otter_camp.cta_button')}
          </button>
        </div>
      )}
    </section>
  );
}
