import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import SocialShareButtons from './SocialShareButtons';

// ============================================================
// Test data
// ============================================================

const defaultProps = {
  postTitle: 'Getting Started with ICP',
  postUrl: 'https://www.helloworlddao.com/blog/getting-started-with-icp',
};

// ============================================================
// Tests
// ============================================================

describe('SocialShareButtons', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders all three share buttons', () => {
    render(<SocialShareButtons {...defaultProps} />);

    expect(screen.getByTestId('share-twitter')).toBeInTheDocument();
    expect(screen.getByTestId('share-linkedin')).toBeInTheDocument();
    expect(screen.getByTestId('share-copy-link')).toBeInTheDocument();
  });

  it('Twitter button generates correct share URL', () => {
    render(<SocialShareButtons {...defaultProps} />);

    const twitterLink = screen.getByTestId('share-twitter');
    const expectedUrl = `https://twitter.com/intent/tweet?text=${encodeURIComponent(defaultProps.postTitle)}&url=${encodeURIComponent(defaultProps.postUrl)}`;
    expect(twitterLink).toHaveAttribute('href', expectedUrl);
    expect(twitterLink).toHaveAttribute('target', '_blank');
    expect(twitterLink).toHaveAttribute('rel', 'noopener noreferrer');
  });

  it('LinkedIn button generates correct share URL', () => {
    render(<SocialShareButtons {...defaultProps} />);

    const linkedInLink = screen.getByTestId('share-linkedin');
    const expectedUrl = `https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(defaultProps.postUrl)}`;
    expect(linkedInLink).toHaveAttribute('href', expectedUrl);
    expect(linkedInLink).toHaveAttribute('target', '_blank');
    expect(linkedInLink).toHaveAttribute('rel', 'noopener noreferrer');
  });

  it('Copy button copies URL to clipboard', async () => {
    const user = userEvent.setup();
    const writeTextMock = vi.fn().mockResolvedValue(undefined);
    Object.defineProperty(navigator, 'clipboard', {
      value: { writeText: writeTextMock },
      writable: true,
      configurable: true,
    });

    render(<SocialShareButtons {...defaultProps} />);

    await user.click(screen.getByTestId('share-copy-link'));

    expect(writeTextMock).toHaveBeenCalledWith(defaultProps.postUrl);
  });

  it('Copy button shows success feedback after copying', async () => {
    const user = userEvent.setup();
    const writeTextMock = vi.fn().mockResolvedValue(undefined);
    Object.defineProperty(navigator, 'clipboard', {
      value: { writeText: writeTextMock },
      writable: true,
      configurable: true,
    });

    render(<SocialShareButtons {...defaultProps} />);

    await user.click(screen.getByTestId('share-copy-link'));

    await waitFor(() => {
      expect(screen.getByTestId('copy-success')).toHaveTextContent('Link copied!');
    });
  });

  it('aria-labels present for accessibility', () => {
    render(<SocialShareButtons {...defaultProps} />);

    expect(screen.getByLabelText('Share on Twitter')).toBeInTheDocument();
    expect(screen.getByLabelText('Share on LinkedIn')).toBeInTheDocument();
    expect(screen.getByLabelText('Copy link')).toBeInTheDocument();
  });

  it('renders text labels for each button', () => {
    render(<SocialShareButtons {...defaultProps} />);

    expect(screen.getByText('Twitter')).toBeInTheDocument();
    expect(screen.getByText('LinkedIn')).toBeInTheDocument();
    expect(screen.getByText('Copy link')).toBeInTheDocument();
  });

  it('encodes special characters in title and URL', () => {
    const specialProps = {
      postTitle: 'Hello & World: "Test" Post',
      postUrl: 'https://www.helloworlddao.com/blog/hello-world',
    };
    render(<SocialShareButtons {...specialProps} />);

    const twitterLink = screen.getByTestId('share-twitter');
    expect(twitterLink.getAttribute('href')).toContain(
      encodeURIComponent(specialProps.postTitle),
    );
  });
});
