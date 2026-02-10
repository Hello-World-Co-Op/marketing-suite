import { useState, useEffect, useMemo } from 'react';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useTranslation } from 'react-i18next';
import { Country, State } from 'country-state-city';
import { interestFormSchema, type InterestFormData } from '../../utils/validation';
import { Select } from '../Select';
import { cn } from '../../utils/cn';
import { getPostalCodeExample } from '../../data/postalCodeFormats';

interface InterestFormProps {
  onSubmit: (data: InterestFormData) => void | Promise<void>;
  onSuccess?: () => void;
  defaultValues?: Partial<InterestFormData>;
  onFormChange?: (data: Partial<InterestFormData>) => void;
}

/**
 * Interest Form Component
 * Collects user information: name, email, and location details
 * WCAG 2.1 AA compliant with full accessibility support
 */
export default function InterestForm({
  onSubmit,
  onSuccess,
  defaultValues,
  onFormChange,
}: InterestFormProps) {
  const { t } = useTranslation('form');
  const {
    register,
    handleSubmit,
    watch,
    control,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<InterestFormData>({
    resolver: zodResolver(interestFormSchema),
    defaultValues,
  });

  // Notify parent of form changes using react-hook-form's subscription API.
  // This avoids the infinite render loop caused by watch() returning new
  // object references — the subscription fires only on actual field changes,
  // not on re-renders.
  useEffect(() => {
    if (!onFormChange) return;
    const subscription = watch((value) => {
      onFormChange(value as Partial<InterestFormData>);
    });
    return () => subscription.unsubscribe();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [watch]);

  const watchedCountry = watch('country');

  const countries = useMemo(
    () =>
      Country.getAllCountries().map((c) => ({
        value: c.isoCode,
        label: c.name,
      })),
    []
  );

  const [states, setStates] = useState<{ value: string; label: string }[]>([]);

  useEffect(() => {
    if (watchedCountry) {
      const countryStates = State.getStatesOfCountry(watchedCountry).map((s) => ({
        value: s.isoCode,
        label: s.name,
      }));
      setStates(countryStates);
    } else {
      setStates([]);
    }
  }, [watchedCountry]);

  const postalCodePlaceholder = watchedCountry ? getPostalCodeExample(watchedCountry) : '12345';

  const handleFormSubmit = async (data: InterestFormData) => {
    try {
      await onSubmit(data);
      reset();
      onSuccess?.();
    } catch (err) {
      if (err instanceof Error) throw err;
      throw new Error(String(err));
    }
  };

  return (
    <form onSubmit={handleSubmit(handleFormSubmit)} className="space-y-6" noValidate>
      <div className="bg-white rounded-lg shadow-md p-6">
        <h2 className="text-2xl font-bold text-slate-900 mb-6">{t('heading')}</h2>

        {/* First Name and Last Name */}
        <div className="grid grid-cols-2 gap-4 mb-4">
          <div>
            <label htmlFor="first_name" className="block text-sm font-medium text-slate-700 mb-2">
              {t('fields.first_name.label')}{' '}
              <span className="text-error" aria-label={t('common:aria_labels.required')}>
                *
              </span>
            </label>
            <input
              id="first_name"
              type="text"
              {...register('first_name')}
              autoComplete="given-name"
              aria-required="true"
              aria-invalid={!!errors.first_name}
              aria-describedby={errors.first_name ? 'first_name-error' : undefined}
              placeholder={t('fields.first_name.placeholder')}
              className={cn(
                'w-full px-4 py-2 border rounded-lg',
                'focus-visible:outline-primary-600',
                'touch-target',
                errors.first_name ? 'border-error focus-visible:outline-error' : 'border-slate-300'
              )}
            />
            {errors.first_name && (
              <p id="first_name-error" role="alert" className="mt-1 text-sm text-error">
                {errors.first_name.message}
              </p>
            )}
          </div>

          <div>
            <label htmlFor="last_name" className="block text-sm font-medium text-slate-700 mb-2">
              {t('fields.last_name.label')}{' '}
              <span className="text-error" aria-label={t('common:aria_labels.required')}>
                *
              </span>
            </label>
            <input
              id="last_name"
              type="text"
              {...register('last_name')}
              autoComplete="family-name"
              aria-required="true"
              aria-invalid={!!errors.last_name}
              aria-describedby={errors.last_name ? 'last_name-error' : undefined}
              placeholder={t('fields.last_name.placeholder')}
              className={cn(
                'w-full px-4 py-2 border rounded-lg',
                'focus-visible:outline-primary-600',
                'touch-target',
                errors.last_name ? 'border-error focus-visible:outline-error' : 'border-slate-300'
              )}
            />
            {errors.last_name && (
              <p id="last_name-error" role="alert" className="mt-1 text-sm text-error">
                {errors.last_name.message}
              </p>
            )}
          </div>
        </div>

        {/* Email */}
        <div className="mb-4">
          <label htmlFor="email" className="block text-sm font-medium text-slate-700 mb-2">
            {t('fields.email.label')}{' '}
            <span className="text-error" aria-label={t('common:aria_labels.required')}>
              *
            </span>
          </label>
          <input
            id="email"
            type="email"
            {...register('email')}
            autoComplete="email"
            aria-required="true"
            aria-invalid={!!errors.email}
            aria-describedby={errors.email ? 'email-error' : 'email-help'}
            placeholder={t('fields.email.placeholder')}
            className={cn(
              'w-full px-4 py-2 border rounded-lg',
              'focus-visible:outline-primary-600',
              'touch-target',
              errors.email ? 'border-error focus-visible:outline-error' : 'border-slate-300'
            )}
          />
          {errors.email ? (
            <p id="email-error" role="alert" className="mt-1 text-sm text-error">
              {errors.email.message}
            </p>
          ) : (
            <p id="email-help" className="mt-1 text-sm text-slate-500">
              {t('fields.email.help')}
            </p>
          )}
        </div>

        {/* Country */}
        <div className="mb-4">
          <label htmlFor="country" className="block text-sm font-medium text-slate-700 mb-2">
            {t('fields.country.label')}{' '}
            <span className="text-slate-500 text-xs">{t('fields.country.optional')}</span>
          </label>
          <Controller
            name="country"
            control={control}
            render={({ field }) => (
              <Select
                id="country"
                value={field.value || ''}
                onChange={field.onChange}
                options={countries}
                placeholder={t('fields.country.placeholder')}
                error={!!errors.country}
                aria-invalid={!!errors.country}
                aria-describedby={errors.country ? 'country-error' : undefined}
              />
            )}
          />
        </div>

        {/* State/Province */}
        {states.length > 0 && (
          <div className="mb-4">
            <label htmlFor="state" className="block text-sm font-medium text-slate-700 mb-2">
              {t('fields.state.label')}
            </label>
            <Controller
              name="state"
              control={control}
              render={({ field }) => (
                <Select
                  id="state"
                  value={field.value || ''}
                  onChange={field.onChange}
                  options={states}
                  placeholder={t('fields.state.placeholder')}
                  error={!!errors.state}
                />
              )}
            />
          </div>
        )}

        {/* City */}
        <div className="mb-4">
          <label htmlFor="city" className="block text-sm font-medium text-slate-700 mb-2">
            {t('fields.city.label')}{' '}
            <span className="text-slate-500 text-xs">{t('fields.city.optional')}</span>
          </label>
          <input
            id="city"
            type="text"
            {...register('city')}
            autoComplete="address-level2"
            placeholder={t('fields.city.placeholder')}
            className={cn(
              'w-full px-4 py-2 border rounded-lg',
              'focus-visible:outline-primary-600',
              'touch-target',
              errors.city ? 'border-error focus-visible:outline-error' : 'border-slate-300'
            )}
          />
        </div>

        {/* Postal Code */}
        <div className="mb-6">
          <label htmlFor="postal_code" className="block text-sm font-medium text-slate-700 mb-2">
            {t('fields.postal_code.label')}{' '}
            <span className="text-slate-500 text-xs">{t('fields.postal_code.optional')}</span>
          </label>
          <input
            id="postal_code"
            type="text"
            {...register('postal_code')}
            autoComplete="postal-code"
            placeholder={postalCodePlaceholder || t('fields.postal_code.placeholder')}
            className={cn(
              'w-full px-4 py-2 border rounded-lg',
              'focus-visible:outline-primary-600',
              'touch-target',
              errors.postal_code ? 'border-error focus-visible:outline-error' : 'border-slate-300'
            )}
          />
        </div>

        {/* Submit Button */}
        <button
          type="submit"
          disabled={isSubmitting}
          className={cn(
            'w-full px-6 py-3',
            'bg-primary-700 text-white',
            'rounded-lg font-semibold',
            'hover:bg-primary-700',
            'focus-visible:outline-primary-600',
            'transition-colors',
            'touch-target',
            isSubmitting && 'opacity-50 cursor-not-allowed'
          )}
        >
          {isSubmitting ? t('submitting') : t('submit')}
        </button>
      </div>
    </form>
  );
}
