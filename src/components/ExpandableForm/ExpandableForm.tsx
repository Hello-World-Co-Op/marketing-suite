import { useRef, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { InterestForm } from '../InterestForm';
import type { InterestFormData } from '../../utils/validation';

interface ExpandableFormProps {
  isOpen: boolean;
  onSubmit: (data: InterestFormData) => Promise<void>;
  onClose: () => void;
  onClear?: () => void;
  triggerRef?: React.RefObject<HTMLElement>; // Reserved for future anchor positioning
  defaultValues?: Partial<InterestFormData>;
  onFormChange?: (data: Partial<InterestFormData>) => void;
}

/**
 * Expandable form that appears below CTA buttons
 * Maintains form state across open/close to prevent data loss
 */
export default function ExpandableForm({
  isOpen,
  onSubmit,
  onClose,
  onClear,
  defaultValues,
  onFormChange,
}: ExpandableFormProps) {
  const { t } = useTranslation('form');
  const formRef = useRef<HTMLDivElement>(null);

  // Scroll form into view when opened
  useEffect(() => {
    if (isOpen && formRef.current) {
      setTimeout(() => {
        formRef.current?.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
      }, 100);
    }
  }, [isOpen]);

  const handleClose = () => {
    if (onClear) {
      onClear();
    }
    onClose();
  };

  return (
    <div
      ref={formRef}
      className="overflow-hidden transition-all duration-500 ease-in-out"
      style={{
        maxHeight: isOpen ? '2000px' : '0px',
        opacity: isOpen ? 1 : 0,
      }}
    >
      <div className="mt-8 p-8 bg-white/95 backdrop-blur-sm rounded-lg shadow-lg border border-primary-200">
        {/* Close button */}
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-2xl font-bold text-slate-900">{t('waitlist_heading')}</h2>
          <button
            onClick={handleClose}
            className="p-2 rounded-full hover:bg-gray-100 transition-colors touch-target"
            aria-label={t('common:aria_labels.close_form')}
          >
            <svg
              className="w-6 h-6 text-gray-600"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M6 18L18 6M6 6l12 12"
              />
            </svg>
          </button>
        </div>

        <InterestForm
          onSubmit={onSubmit}
          defaultValues={defaultValues}
          onFormChange={onFormChange}
        />
      </div>
    </div>
  );
}
