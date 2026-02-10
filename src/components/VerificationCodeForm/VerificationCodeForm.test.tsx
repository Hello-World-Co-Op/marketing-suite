import { describe, it, expect, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import VerificationCodeForm from './VerificationCodeForm';

describe('VerificationCodeForm', () => {
  const defaultProps = {
    email: 'test@example.com',
    onVerify: vi.fn(),
    onResend: vi.fn(),
    onCancel: vi.fn(),
  };

  it('renders the verification heading', () => {
    render(<VerificationCodeForm {...defaultProps} />);

    expect(screen.getByText(/Verify Your Email/)).toBeInTheDocument();
  });

  it('displays the email address', () => {
    render(<VerificationCodeForm {...defaultProps} />);

    expect(screen.getByText('test@example.com')).toBeInTheDocument();
  });

  it('has a numeric code input field', () => {
    render(<VerificationCodeForm {...defaultProps} />);

    const input = screen.getByLabelText(/Verification Code/);
    expect(input).toBeInTheDocument();
    expect(input).toHaveAttribute('inputMode', 'numeric');
    expect(input).toHaveAttribute('maxLength', '6');
    expect(input).toHaveAttribute('autoComplete', 'one-time-code');
  });

  it('only accepts numeric input', async () => {
    const user = userEvent.setup();
    render(<VerificationCodeForm {...defaultProps} />);

    const input = screen.getByLabelText(/Verification Code/);

    // Type each character individually to properly handle state updates
    await user.clear(input);
    await user.type(input, '12abc3');

    // Wait for final state to settle
    await waitFor(() => {
      expect(input).toHaveValue('123');
    }, { timeout: 2000 });
  });

  it('limits input to 6 digits', async () => {
    const user = userEvent.setup();
    render(<VerificationCodeForm {...defaultProps} />);

    const input = screen.getByLabelText(/Verification Code/);

    // Type with delay to allow state updates to complete
    await user.clear(input);
    await user.type(input, '12345678');

    // Wait for final state to settle
    await waitFor(() => {
      expect(input).toHaveValue('123456');
    }, { timeout: 2000 });
  });

  it('verify button is disabled when code is not 6 digits', () => {
    render(<VerificationCodeForm {...defaultProps} />);

    const verifyButton = screen.getByRole('button', { name: /Verify Email/ });
    expect(verifyButton).toBeDisabled();
  });

  it('verify button is enabled when code is 6 digits', async () => {
    const user = userEvent.setup();
    render(<VerificationCodeForm {...defaultProps} />);

    const input = screen.getByLabelText(/Verification Code/);
    await user.type(input, '123456');

    await waitFor(() => {
      const verifyButton = screen.getByRole('button', { name: /Verify Email/ });
      expect(verifyButton).toBeEnabled();
    });
  });

  it('calls onVerify with code when form is submitted', async () => {
    const user = userEvent.setup();
    const onVerify = vi.fn().mockResolvedValue(undefined);
    render(<VerificationCodeForm {...defaultProps} onVerify={onVerify} />);

    const input = screen.getByLabelText(/Verification Code/);
    await user.type(input, '123456');

    const verifyButton = screen.getByRole('button', { name: /Verify Email/ });
    await user.click(verifyButton);

    await waitFor(() => {
      expect(onVerify).toHaveBeenCalledWith('123456');
    });
  });

  it('calls onCancel when cancel button is clicked', async () => {
    const user = userEvent.setup();
    const onCancel = vi.fn();
    render(<VerificationCodeForm {...defaultProps} onCancel={onCancel} />);

    const cancelButton = screen.getByRole('button', { name: /Cancel/ });
    await user.click(cancelButton);

    await waitFor(() => {
      expect(onCancel).toHaveBeenCalled();
    });
  });

  it('calls onResend when resend button is clicked', async () => {
    const user = userEvent.setup();
    const onResend = vi.fn().mockResolvedValue(undefined);
    render(<VerificationCodeForm {...defaultProps} onResend={onResend} />);

    const resendButton = screen.getByRole('button', { name: /Resend Code/ });
    await user.click(resendButton);

    await waitFor(() => {
      expect(onResend).toHaveBeenCalled();
    });
  });

  it('shows error message on verify failure', async () => {
    const user = userEvent.setup();
    const onVerify = vi.fn().mockRejectedValue(new Error('Invalid code'));
    render(<VerificationCodeForm {...defaultProps} onVerify={onVerify} />);

    const input = screen.getByLabelText(/Verification Code/);
    await user.type(input, '123456');

    const verifyButton = screen.getByRole('button', { name: /Verify Email/ });
    await user.click(verifyButton);

    await waitFor(() => {
      expect(screen.getByText('Invalid code')).toBeInTheDocument();
    });
  });

  it('has proper ARIA attributes for accessibility', () => {
    render(<VerificationCodeForm {...defaultProps} />);

    const input = screen.getByLabelText(/Verification Code/);
    expect(input).toHaveAttribute('aria-required', 'true');
    expect(input).toHaveAttribute('aria-describedby', 'code-help');
  });
});
