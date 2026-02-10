import React from 'react';
import { useTranslation, Trans } from 'react-i18next';

/**
 * Rabbit Whole Platform Description
 */
export default function RabbitWholeSection() {
  const { t } = useTranslation('launch');

  return (
    <section className="space-y-6">
      <h2 className="text-2xl md:text-3xl font-bold text-slate-900">{t('rabbit_whole.heading')}</h2>

      <p className="text-lg leading-relaxed">{t('rabbit_whole.intro')}</p>

      <p className="text-lg leading-relaxed">
        <Trans i18nKey="rabbit_whole.rewards" ns="launch" components={{ strong: <strong /> }} />
      </p>

      <p className="text-lg leading-relaxed">
        <Trans i18nKey="rabbit_whole.offline" ns="launch" components={{ strong: <strong /> }} />
      </p>
    </section>
  );
}
