import React from 'react';
import { useTranslation, Trans } from 'react-i18next';

interface ClosingSectionProps {
  onJoinWaitlist?: () => void;
  isFormOpen?: boolean;
}

/**
 * Closing Call to Action Section
 */
export default function ClosingSection({ onJoinWaitlist, isFormOpen }: ClosingSectionProps) {
  const { t } = useTranslation('launch');

  return (
    <section className="space-y-6">
      <h2 className="text-3xl md:text-4xl font-bold text-slate-900">{t('closing.heading')}</h2>

      <p className="text-lg leading-relaxed">{t('closing.intro')}</p>

      <p className="text-lg leading-relaxed">
        <Trans i18nKey="closing.call_to_action" ns="launch" components={{ strong: <strong /> }} />
      </p>

      <p className="text-lg leading-relaxed">{t('closing.welcome')}</p>

      {onJoinWaitlist && (
        <div className="flex justify-center mt-8">
          <button
            onClick={onJoinWaitlist}
            className={`px-10 py-4 rounded-lg font-bold text-xl transition-colors shadow-lg hover:shadow-xl ${
              isFormOpen
                ? 'bg-gray-600 text-white hover:bg-gray-700'
                : 'bg-primary-700 text-white hover:bg-primary-800'
            }`}
          >
            {isFormOpen ? t('common:buttons.cancel') : t('closing.cta_button')}
          </button>
        </div>
      )}

      <div className="mt-8 p-6 bg-primary-50 rounded-lg border border-primary-200">
        <p className="text-center text-primary-900 font-semibold text-lg">{t('closing.footer')}</p>
      </div>
    </section>
  );
}
