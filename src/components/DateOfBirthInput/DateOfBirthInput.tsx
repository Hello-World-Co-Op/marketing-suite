import { useMemo } from 'react';
import { cn } from '@/utils/cn';

/**
 * Month names for the dropdown
 */
const MONTHS = [
  { value: 1, label: 'January' },
  { value: 2, label: 'February' },
  { value: 3, label: 'March' },
  { value: 4, label: 'April' },
  { value: 5, label: 'May' },
  { value: 6, label: 'June' },
  { value: 7, label: 'July' },
  { value: 8, label: 'August' },
  { value: 9, label: 'September' },
  { value: 10, label: 'October' },
  { value: 11, label: 'November' },
  { value: 12, label: 'December' },
];

export interface DateOfBirthValue {
  month: number;
  day: number;
  year: number;
}

export interface DateOfBirthInputProps {
  value: DateOfBirthValue | null;
  onChange: (value: DateOfBirthValue | null) => void;
  disabled?: boolean;
  error?: string;
}

/**
 * Get the number of days in a given month/year, accounting for leap years
 */
// eslint-disable-next-line react-refresh/only-export-components
export function getDaysInMonth(month: number, year: number): number {
  if (month < 1 || month > 12) return 31;
  // Use Date constructor: day 0 of next month = last day of this month
  return new Date(year, month, 0).getDate();
}

/**
 * Check if a given year is a leap year
 */
// eslint-disable-next-line react-refresh/only-export-components
export function isLeapYear(year: number): boolean {
  return (year % 4 === 0 && year % 100 !== 0) || year % 400 === 0;
}

const selectClassName = cn(
  'w-full px-3 py-2 border rounded-lg text-base',
  'focus-visible:outline-primary-600',
  'border-slate-300',
  'disabled:cursor-not-allowed disabled:opacity-50'
);

/**
 * DateOfBirthInput - Three-dropdown date of birth selector
 *
 * COPPA compliance: This component is placed BEFORE any PII fields
 * (name, email, password) to ensure age verification happens before
 * collecting personal information.
 *
 * Handles:
 * - Month (1-12 with names)
 * - Day (1-31, dynamically adjusted per month/year)
 * - Year (current year down to current year - 120)
 * - Leap year detection
 * - Impossible date prevention (e.g., Feb 30)
 */
export default function DateOfBirthInput({
  value,
  onChange,
  disabled = false,
  error,
}: DateOfBirthInputProps) {
  const currentYear = new Date().getFullYear();

  // Generate year options: current year down to current year - 120
  const years = useMemo(() => {
    const result: number[] = [];
    for (let y = currentYear; y >= currentYear - 120; y--) {
      result.push(y);
    }
    return result;
  }, [currentYear]);

  // Calculate max days for the selected month/year
  const maxDays = useMemo(() => {
    if (!value?.month || !value?.year) return 31;
    return getDaysInMonth(value.month, value.year);
  }, [value?.month, value?.year]);

  // Generate day options based on month/year
  const days = useMemo(() => {
    const result: number[] = [];
    for (let d = 1; d <= maxDays; d++) {
      result.push(d);
    }
    return result;
  }, [maxDays]);

  const handleMonthChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const month = e.target.value ? parseInt(e.target.value, 10) : 0;
    if (!month) {
      onChange(null);
      return;
    }
    const newValue: DateOfBirthValue = {
      month,
      day: value?.day || 0,
      year: value?.year || 0,
    };
    // Adjust day if it exceeds the max for the new month
    if (newValue.day && newValue.year) {
      const newMax = getDaysInMonth(month, newValue.year);
      if (newValue.day > newMax) {
        newValue.day = newMax;
      }
    }
    onChange(newValue);
  };

  const handleDayChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const day = e.target.value ? parseInt(e.target.value, 10) : 0;
    if (!day) {
      onChange(null);
      return;
    }
    onChange({
      month: value?.month || 0,
      day,
      year: value?.year || 0,
    });
  };

  const handleYearChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const year = e.target.value ? parseInt(e.target.value, 10) : 0;
    if (!year) {
      onChange(null);
      return;
    }
    const newValue: DateOfBirthValue = {
      month: value?.month || 0,
      day: value?.day || 0,
      year,
    };
    // Adjust day if it exceeds max for the new year (leap year change)
    if (newValue.month && newValue.day) {
      const newMax = getDaysInMonth(newValue.month, year);
      if (newValue.day > newMax) {
        newValue.day = newMax;
      }
    }
    onChange(newValue);
  };

  return (
    <div className="space-y-2">
      <label className="block text-sm font-medium text-slate-700">Date of Birth</label>
      <div className="grid grid-cols-3 gap-2">
        {/* Month dropdown */}
        <select
          aria-label="Month"
          className={selectClassName}
          value={value?.month || ''}
          onChange={handleMonthChange}
          disabled={disabled}
          data-testid="dob-month"
        >
          <option value="">Month</option>
          {MONTHS.map((m) => (
            <option key={m.value} value={m.value}>
              {m.label}
            </option>
          ))}
        </select>

        {/* Day dropdown */}
        <select
          aria-label="Day"
          className={selectClassName}
          value={value?.day || ''}
          onChange={handleDayChange}
          disabled={disabled}
          data-testid="dob-day"
        >
          <option value="">Day</option>
          {days.map((d) => (
            <option key={d} value={d}>
              {d}
            </option>
          ))}
        </select>

        {/* Year dropdown */}
        <select
          aria-label="Year"
          className={selectClassName}
          value={value?.year || ''}
          onChange={handleYearChange}
          disabled={disabled}
          data-testid="dob-year"
        >
          <option value="">Year</option>
          {years.map((y) => (
            <option key={y} value={y}>
              {y}
            </option>
          ))}
        </select>
      </div>
      {error && (
        <p className="text-sm text-error" role="alert">
          {error}
        </p>
      )}
    </div>
  );
}
