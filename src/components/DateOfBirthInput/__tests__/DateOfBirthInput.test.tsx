import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import DateOfBirthInput, { getDaysInMonth, isLeapYear } from '../DateOfBirthInput';

describe('getDaysInMonth', () => {
  it('returns 31 for January', () => {
    expect(getDaysInMonth(1, 2024)).toBe(31);
  });

  it('returns 28 for February in a non-leap year', () => {
    expect(getDaysInMonth(2, 2023)).toBe(28);
  });

  it('returns 29 for February in a leap year', () => {
    expect(getDaysInMonth(2, 2024)).toBe(29);
  });

  it('returns 30 for April', () => {
    expect(getDaysInMonth(4, 2024)).toBe(30);
  });

  it('returns 31 for invalid month < 1', () => {
    expect(getDaysInMonth(0, 2024)).toBe(31);
  });

  it('returns 31 for invalid month > 12', () => {
    expect(getDaysInMonth(13, 2024)).toBe(31);
  });
});

describe('isLeapYear', () => {
  it('returns true for years divisible by 4 but not 100', () => {
    expect(isLeapYear(2024)).toBe(true);
  });

  it('returns false for years divisible by 100 but not 400', () => {
    expect(isLeapYear(1900)).toBe(false);
  });

  it('returns true for years divisible by 400', () => {
    expect(isLeapYear(2000)).toBe(true);
  });

  it('returns false for regular non-leap years', () => {
    expect(isLeapYear(2023)).toBe(false);
  });
});

describe('DateOfBirthInput', () => {
  it('renders three dropdowns with labels', () => {
    const onChange = vi.fn();
    render(<DateOfBirthInput value={null} onChange={onChange} />);

    expect(screen.getByLabelText('Month')).toBeInTheDocument();
    expect(screen.getByLabelText('Day')).toBeInTheDocument();
    expect(screen.getByLabelText('Year')).toBeInTheDocument();
    expect(screen.getByText('Date of Birth')).toBeInTheDocument();
  });

  it('calls onChange when month is selected', () => {
    const onChange = vi.fn();
    render(<DateOfBirthInput value={null} onChange={onChange} />);

    fireEvent.change(screen.getByTestId('dob-month'), { target: { value: '3' } });
    expect(onChange).toHaveBeenCalledWith({ month: 3, day: 0, year: 0 });
  });

  it('calls onChange with null when month is cleared', () => {
    const onChange = vi.fn();
    render(
      <DateOfBirthInput value={{ month: 3, day: 15, year: 2000 }} onChange={onChange} />
    );

    fireEvent.change(screen.getByTestId('dob-month'), { target: { value: '' } });
    expect(onChange).toHaveBeenCalledWith(null);
  });

  it('calls onChange when day is selected', () => {
    const onChange = vi.fn();
    render(
      <DateOfBirthInput value={{ month: 1, day: 0, year: 0 }} onChange={onChange} />
    );

    fireEvent.change(screen.getByTestId('dob-day'), { target: { value: '15' } });
    expect(onChange).toHaveBeenCalledWith({ month: 1, day: 15, year: 0 });
  });

  it('calls onChange when year is selected', () => {
    const onChange = vi.fn();
    render(
      <DateOfBirthInput value={{ month: 1, day: 15, year: 0 }} onChange={onChange} />
    );

    fireEvent.change(screen.getByTestId('dob-year'), { target: { value: '2000' } });
    expect(onChange).toHaveBeenCalledWith({ month: 1, day: 15, year: 2000 });
  });

  it('adjusts day when month changes and day exceeds new max', () => {
    const onChange = vi.fn();
    // Start with March 31, 2023 - changing to February should cap day at 28
    render(
      <DateOfBirthInput value={{ month: 3, day: 31, year: 2023 }} onChange={onChange} />
    );

    fireEvent.change(screen.getByTestId('dob-month'), { target: { value: '2' } });
    expect(onChange).toHaveBeenCalledWith({ month: 2, day: 28, year: 2023 });
  });

  it('adjusts day when year changes and causes leap year change', () => {
    const onChange = vi.fn();
    // Start with Feb 29, 2024 (leap year) - changing to 2023 should cap to 28
    render(
      <DateOfBirthInput value={{ month: 2, day: 29, year: 2024 }} onChange={onChange} />
    );

    fireEvent.change(screen.getByTestId('dob-year'), { target: { value: '2023' } });
    expect(onChange).toHaveBeenCalledWith({ month: 2, day: 28, year: 2023 });
  });

  it('displays error message when error prop is provided', () => {
    const onChange = vi.fn();
    render(
      <DateOfBirthInput value={null} onChange={onChange} error="Invalid date" />
    );

    expect(screen.getByText('Invalid date')).toBeInTheDocument();
    expect(screen.getByRole('alert')).toBeInTheDocument();
  });

  it('disables all dropdowns when disabled prop is true', () => {
    const onChange = vi.fn();
    render(<DateOfBirthInput value={null} onChange={onChange} disabled={true} />);

    expect(screen.getByTestId('dob-month')).toBeDisabled();
    expect(screen.getByTestId('dob-day')).toBeDisabled();
    expect(screen.getByTestId('dob-year')).toBeDisabled();
  });

  it('shows correct month options', () => {
    const onChange = vi.fn();
    render(<DateOfBirthInput value={null} onChange={onChange} />);

    const monthSelect = screen.getByTestId('dob-month');
    expect(monthSelect).toContainElement(screen.getByText('January'));
    expect(monthSelect).toContainElement(screen.getByText('December'));
  });

  it('displays selected values correctly', () => {
    const onChange = vi.fn();
    render(
      <DateOfBirthInput
        value={{ month: 6, day: 15, year: 1990 }}
        onChange={onChange}
      />
    );

    expect(screen.getByTestId('dob-month')).toHaveValue('6');
    expect(screen.getByTestId('dob-day')).toHaveValue('15');
    expect(screen.getByTestId('dob-year')).toHaveValue('1990');
  });
});
