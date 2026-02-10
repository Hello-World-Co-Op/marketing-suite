import { describe, it, expect, vi } from 'vitest';
import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import HeroSection from './HeroSection';

// Helper to simulate image load event (typing animation waits for image to load)
const simulateImageLoad = () => {
  const image = screen.getByAltText(/Earth from space/i);
  fireEvent.load(image);
};

describe('HeroSection', () => {
  it('renders the Hello World heading', async () => {
    render(<HeroSection />);

    // Simulate image load to trigger typing animation
    simulateImageLoad();

    const heading = screen.getByRole('heading', { level: 1 });
    expect(heading).toBeInTheDocument();

    // Wait for typing animation to complete (11 chars * 250ms = 2750ms)
    await waitFor(
      () => {
        expect(heading).toHaveTextContent('Hello World');
      },
      { timeout: 3500 }
    );
  });

  it('renders the globe image with proper alt text', () => {
    render(<HeroSection />);

    const image = screen.getByAltText(/Earth from space/i);
    expect(image).toBeInTheDocument();
  });

  it('renders Learn More button after typing completes', async () => {
    render(<HeroSection />);

    // Simulate image load to trigger typing animation
    simulateImageLoad();

    // Wait for typing animation to complete before button appears
    await waitFor(
      () => {
        const button = screen.queryByRole('button');
        expect(button).toBeInTheDocument();
      },
      { timeout: 4000 }
    );
  });

  it('Learn More button calls onLearnMore when clicked', async () => {
    const user = userEvent.setup();
    const mockLearnMore = vi.fn();

    render(<HeroSection onLearnMore={mockLearnMore} />);

    // Simulate image load to trigger typing animation
    simulateImageLoad();

    // Wait for button to appear after typing animation
    let button: HTMLElement | null = null;
    await waitFor(
      () => {
        button = screen.queryByRole('button');
        expect(button).toBeInTheDocument();
      },
      { timeout: 4000 }
    );

    await user.click(button!);
    expect(mockLearnMore).toHaveBeenCalled();
  });

  it('renders with proper semantic HTML structure', () => {
    const { container } = render(<HeroSection />);

    const section = container.querySelector('section');
    expect(section).toBeInTheDocument();
  });

  it('has centered layout', () => {
    const { container } = render(<HeroSection />);

    const section = container.querySelector('section');
    expect(section?.className).toMatch(/flex/);
    expect(section?.className).toMatch(/items-center/);
    expect(section?.className).toMatch(/justify-center/);
  });
});
