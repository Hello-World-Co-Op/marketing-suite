import { Fragment } from 'react';
import { Listbox, Transition } from '@headlessui/react';
import { cn } from '../../utils/cn';

interface SelectOption {
  value: string;
  label: string;
}

interface SelectProps {
  value: string;
  onChange: (value: string) => void;
  options: SelectOption[];
  placeholder?: string;
  error?: boolean;
  id?: string;
  'aria-invalid'?: boolean;
  'aria-describedby'?: string;
}

/**
 * Custom Select Component using Headless UI
 * WCAG 2.1 AA compliant with proper keyboard navigation
 */
export default function Select({
  value,
  onChange,
  options,
  placeholder = 'Select an option',
  error = false,
  id,
  ...ariaProps
}: SelectProps) {
  const selectedOption = options.find((opt) => opt.value === value);

  return (
    <Listbox value={value} onChange={onChange}>
      {({ open }) => (
        <div className="relative">
          <Listbox.Button
            id={id}
            {...ariaProps}
            className={cn(
              'relative w-full px-4 py-2 border rounded-lg text-left',
              'focus-visible:outline-primary-600',
              'touch-target',
              'cursor-pointer',
              error ? 'border-error focus-visible:outline-error' : 'border-slate-300',
              !selectedOption && 'text-slate-400'
            )}
          >
            <span className="block truncate">
              {selectedOption ? selectedOption.label : placeholder}
            </span>
            <span className="pointer-events-none absolute inset-y-0 right-0 flex items-center pr-2">
              <svg
                className={cn(
                  'h-5 w-5 text-slate-400 transition-transform',
                  open && 'transform rotate-180'
                )}
                viewBox="0 0 20 20"
                fill="currentColor"
                aria-hidden="true"
              >
                <path
                  fillRule="evenodd"
                  d="M5.23 7.21a.75.75 0 011.06.02L10 11.168l3.71-3.938a.75.75 0 111.08 1.04l-4.25 4.5a.75.75 0 01-1.08 0l-4.25-4.5a.75.75 0 01.02-1.06z"
                  clipRule="evenodd"
                />
              </svg>
            </span>
          </Listbox.Button>

          <Transition
            as={Fragment}
            leave="transition ease-in duration-100"
            leaveFrom="opacity-100"
            leaveTo="opacity-0"
          >
            <Listbox.Options className="absolute z-10 mt-1 max-h-60 w-full overflow-auto rounded-lg bg-white py-1 shadow-lg ring-1 ring-black ring-opacity-5 focus:outline-none">
              {options.map((option) => (
                <Listbox.Option
                  key={option.value}
                  value={option.value}
                  className={({ active }) =>
                    cn(
                      'relative cursor-pointer select-none py-2 px-4',
                      active ? 'bg-primary-100 text-primary-900' : 'text-slate-900'
                    )
                  }
                >
                  {({ selected }) => (
                    <span
                      className={cn('block truncate', selected ? 'font-semibold' : 'font-normal')}
                    >
                      {option.label}
                    </span>
                  )}
                </Listbox.Option>
              ))}
            </Listbox.Options>
          </Transition>
        </div>
      )}
    </Listbox>
  );
}
