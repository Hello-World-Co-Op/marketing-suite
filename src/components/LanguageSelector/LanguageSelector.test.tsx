import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import LanguageSelector from './LanguageSelector';

// Need to get reference to mock changeLanguage
const mockChangeLanguage = vi.fn();

vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string) => key,
    i18n: {
      language: 'en',
      changeLanguage: mockChangeLanguage,
    },
  }),
}));

describe('LanguageSelector', () => {
  it('renders a select element', () => {
    render(<LanguageSelector />);

    const select = screen.getByRole('combobox');
    expect(select).toBeInTheDocument();
  });

  it('has 4 language options', () => {
    render(<LanguageSelector />);

    const options = screen.getAllByRole('option');
    expect(options).toHaveLength(4);
  });

  it('displays English as the current language', () => {
    render(<LanguageSelector />);

    const select = screen.getByRole('combobox');
    expect(select).toHaveValue('en');
  });

  it('calls changeLanguage when a new language is selected', async () => {
    const user = userEvent.setup();
    render(<LanguageSelector />);

    const select = screen.getByRole('combobox');
    await user.selectOptions(select, 'es');

    expect(mockChangeLanguage).toHaveBeenCalledWith('es');
  });

  it('has an accessible label', () => {
    render(<LanguageSelector />);

    const label = screen.getByLabelText(/select_language/);
    expect(label).toBeInTheDocument();
  });

  it('applies custom className', () => {
    const { container } = render(<LanguageSelector className="custom-class" />);

    const wrapper = container.firstElementChild;
    expect(wrapper?.className).toContain('custom-class');
  });
});
