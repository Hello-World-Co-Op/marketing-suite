import React from 'react';
import { useTranslation } from 'react-i18next';

interface ThinkTankSectionProps {
  onJoinWaitlist?: () => void;
  isFormOpen?: boolean;
}

/**
 * Think Tank App Description
 */
export default function ThinkTankSection({ onJoinWaitlist, isFormOpen }: ThinkTankSectionProps) {
  const { t } = useTranslation('launch');

  return (
    <section className="space-y-6">
      <h2 className="text-2xl md:text-3xl font-bold text-slate-900">{t('think_tank.heading')}</h2>

      <p className="text-lg leading-relaxed">{t('think_tank.intro')}</p>

      <p className="text-lg leading-relaxed">{t('think_tank.question')}</p>

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
            {isFormOpen ? t('common:buttons.cancel') : t('think_tank.cta_button')}
          </button>
        </div>
      )}
    </section>
  );
}
