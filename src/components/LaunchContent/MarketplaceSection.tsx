import React from 'react';
import { useTranslation, Trans } from 'react-i18next';

/**
 * Co-Op Marketplace Platform Description
 */
export default function MarketplaceSection() {
  const { t } = useTranslation('launch');

  return (
    <section className="space-y-6">
      <h2 className="text-2xl md:text-3xl font-bold text-slate-900">{t('marketplace.heading')}</h2>

      <p className="text-lg leading-relaxed">{t('marketplace.intro')}</p>

      <p className="text-lg leading-relaxed">
        <Trans i18nKey="marketplace.standards" ns="launch" components={{ strong: <strong /> }} />
      </p>
    </section>
  );
}
