import React from 'react';
import { useTranslation, Trans } from 'react-i18next';

/**
 * Ecosystem Overview Section
 */
export default function EcosystemSection() {
  const { t } = useTranslation('launch');

  return (
    <section className="space-y-8">
      <div>
        <h2 className="text-3xl md:text-4xl font-bold text-slate-900 mb-6">
          {t('ecosystem.heading')}
        </h2>

        <p className="text-lg leading-relaxed mb-4">{t('ecosystem.intro_1')}</p>

        <p className="text-lg leading-relaxed">
          <Trans i18nKey="ecosystem.intro_2" ns="launch" components={{ strong: <strong /> }} />
        </p>
      </div>

      <ul className="space-y-2 text-lg list-disc list-inside ml-4">
        <li>
          <Trans
            i18nKey="ecosystem.parts.otter_camp"
            ns="launch"
            components={{ strong: <strong /> }}
          />
        </li>
        <li>
          <Trans
            i18nKey="ecosystem.parts.marketplace"
            ns="launch"
            components={{ strong: <strong /> }}
          />
        </li>
        <li>
          <Trans
            i18nKey="ecosystem.parts.rabbit_whole"
            ns="launch"
            components={{ strong: <strong /> }}
          />
        </li>
        <li>
          <Trans
            i18nKey="ecosystem.parts.think_tank"
            ns="launch"
            components={{ strong: <strong /> }}
          />
        </li>
        <li>
          <Trans
            i18nKey="ecosystem.parts.campuses"
            ns="launch"
            components={{ strong: <strong /> }}
          />
        </li>
      </ul>

      <p className="text-lg leading-relaxed">{t('ecosystem.conclusion')}</p>
    </section>
  );
}
