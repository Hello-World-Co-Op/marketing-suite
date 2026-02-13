import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import PasswordStrengthMeter from '../PasswordStrengthMeter';

describe('PasswordStrengthMeter', () => {
  it('renders nothing when password is empty', () => {
    const { container } = render(<PasswordStrengthMeter password="" />);
    expect(container.firstChild).toBeNull();
  });

  it('shows "Weak" for a weak password', () => {
    render(<PasswordStrengthMeter password="abc" />);
    expect(screen.getByTestId('strength-text')).toHaveTextContent('Weak');
  });

  it('shows "Fair" for a password with partial requirements', () => {
    // Has length, lowercase, and number but missing uppercase and special
    render(<PasswordStrengthMeter password="alllowercase1" />);
    const text = screen.getByTestId('strength-text').textContent;
    // With 3 checks met (length + lowercase + number) = 60 points -> FAIR
    expect(text).toBe('Fair');
  });

  it('shows "Good" for a password meeting most requirements', () => {
    // Has length, uppercase, lowercase, number but no special
    render(<PasswordStrengthMeter password="GoodPassword1" />);
    const text = screen.getByTestId('strength-text').textContent;
    // 4 checks met = 80 -> GOOD
    expect(text).toBe('Good');
  });

  it('shows "Strong" for a password meeting all requirements', () => {
    // Has length, uppercase, lowercase, number, special + bonus
    render(<PasswordStrengthMeter password="VeryStr0ng!Pass@word" />);
    const text = screen.getByTestId('strength-text').textContent;
    expect(text).toBe('Strong');
  });

  it('displays feedback messages when showFeedback is true', () => {
    render(<PasswordStrengthMeter password="abc" showFeedback={true} />);
    // Should show requirement feedback
    expect(screen.getByText(/at least 12 characters/)).toBeInTheDocument();
  });

  it('shows requirement badges when showFeedback is false', () => {
    render(<PasswordStrengthMeter password="abc" showFeedback={false} />);
    expect(screen.getByText(/12\+ chars/)).toBeInTheDocument();
    expect(screen.getByText(/Uppercase/)).toBeInTheDocument();
    expect(screen.getByText(/Lowercase/)).toBeInTheDocument();
    expect(screen.getByText(/Number/)).toBeInTheDocument();
    expect(screen.getByText(/Special/)).toBeInTheDocument();
  });

  it('shows success message when all requirements are met and no warnings', () => {
    render(<PasswordStrengthMeter password="Xk9#mZ2!pQ7$" showFeedback={true} />);
    expect(screen.getByText('Password meets all requirements')).toBeInTheDocument();
  });

  it('shows pattern warnings for common patterns', () => {
    render(<PasswordStrengthMeter password="MyPassword1!!" showFeedback={true} />);
    expect(screen.getByText(/common words/)).toBeInTheDocument();
  });

  it('renders the strength bar with correct width', () => {
    render(<PasswordStrengthMeter password="Xk9#mZ2!pQ7$" />);
    const bar = screen.getByTestId('strength-bar');
    expect(bar).toBeInTheDocument();
    // The style width should be > 0%
    expect(bar.style.width).not.toBe('0%');
  });

  it('applies custom className', () => {
    render(<PasswordStrengthMeter password="test" className="custom-class" />);
    const meter = screen.getByTestId('password-strength-meter');
    expect(meter.className).toContain('custom-class');
  });
});
