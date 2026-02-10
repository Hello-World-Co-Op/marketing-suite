import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import ExpandableForm from './ExpandableForm';

// Mock InterestForm to isolate ExpandableForm behavior
vi.mock('../InterestForm', () => ({
  InterestForm: () => <div data-testid="interest-form">Interest Form</div>,
}));

describe('ExpandableForm', () => {
  const defaultProps = {
    isOpen: false,
    onSubmit: vi.fn(),
    onClose: vi.fn(),
  };

  it('renders collapsed when isOpen is false', () => {
    const { container } = render(<ExpandableForm {...defaultProps} />);

    // Should have maxHeight of 0px and opacity 0
    const wrapper = container.firstElementChild as HTMLElement;
    expect(wrapper.style.maxHeight).toBe('0px');
    expect(wrapper.style.opacity).toBe('0');
  });

  it('renders expanded when isOpen is true', () => {
    const { container } = render(<ExpandableForm {...defaultProps} isOpen={true} />);

    // Should have maxHeight of 2000px and opacity 1
    const wrapper = container.firstElementChild as HTMLElement;
    expect(wrapper.style.maxHeight).toBe('2000px');
    expect(wrapper.style.opacity).toBe('1');
  });

  it('shows the waitlist heading when open', () => {
    render(<ExpandableForm {...defaultProps} isOpen={true} />);

    // The mock returns the i18n key as text
    expect(screen.getByText(/waitlist_heading/)).toBeInTheDocument();
  });

  it('renders the InterestForm when open', () => {
    render(<ExpandableForm {...defaultProps} isOpen={true} />);

    expect(screen.getByTestId('interest-form')).toBeInTheDocument();
  });

  it('calls onClose and onClear when close button is clicked', async () => {
    const user = userEvent.setup();
    const onClose = vi.fn();
    const onClear = vi.fn();

    render(
      <ExpandableForm {...defaultProps} isOpen={true} onClose={onClose} onClear={onClear} />
    );

    const closeButton = screen.getByLabelText(/close_form/);
    await user.click(closeButton);

    expect(onClear).toHaveBeenCalled();
    expect(onClose).toHaveBeenCalled();
  });

  it('calls only onClose when close button is clicked without onClear', async () => {
    const user = userEvent.setup();
    const onClose = vi.fn();

    render(<ExpandableForm {...defaultProps} isOpen={true} onClose={onClose} />);

    const closeButton = screen.getByLabelText(/close_form/);
    await user.click(closeButton);

    expect(onClose).toHaveBeenCalled();
  });

  it('has accessible close button', () => {
    render(<ExpandableForm {...defaultProps} isOpen={true} />);

    const closeButton = screen.getByLabelText(/close_form/);
    expect(closeButton).toBeInTheDocument();
    expect(closeButton.tagName).toBe('BUTTON');
  });
});
