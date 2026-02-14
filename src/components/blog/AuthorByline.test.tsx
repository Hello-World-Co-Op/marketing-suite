import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import AuthorByline, { calculateReadingTime, formatPublishedDate } from './AuthorByline';

// ============================================================
// Test data
// ============================================================

const defaultProps = {
  authorName: 'Alice Admin',
  authorRole: 'Admin',
  publishedAt: new Date('2026-02-10T12:00:00Z').getTime(),
  body: '<p>' + Array(400).fill('word').join(' ') + '</p>',
};

// ============================================================
// calculateReadingTime tests
// ============================================================

describe('calculateReadingTime', () => {
  it('returns 1 min for 200 words or fewer', () => {
    const body = '<p>' + Array(200).fill('word').join(' ') + '</p>';
    expect(calculateReadingTime(body)).toBe(1);
  });

  it('returns 2 min for 201-400 words', () => {
    const body = '<p>' + Array(250).fill('word').join(' ') + '</p>';
    expect(calculateReadingTime(body)).toBe(2);
  });

  it('returns at least 1 min for very short content', () => {
    expect(calculateReadingTime('<p>short</p>')).toBe(1);
    expect(calculateReadingTime('<p></p>')).toBe(1);
  });

  it('handles long content correctly', () => {
    const body = '<p>' + Array(1000).fill('word').join(' ') + '</p>';
    expect(calculateReadingTime(body)).toBe(5);
  });

  it('strips HTML tags when counting words', () => {
    const body = '<h2>Title</h2><p>One <strong>two</strong> three <a href="#">four</a> five</p>';
    // Should count: Title, One, two, three, four, five = 6 words
    expect(calculateReadingTime(body)).toBe(1);
  });

  it('handles code blocks in word count', () => {
    const body = '<p>' + Array(199).fill('word').join(' ') + '</p><pre><code>const x = 1;</code></pre>';
    // 199 words + "const x = 1;" counts as 4 words = 203 total
    expect(calculateReadingTime(body)).toBe(2);
  });
});

// ============================================================
// formatPublishedDate tests
// ============================================================

describe('formatPublishedDate', () => {
  it('formats date in long format', () => {
    const timestamp = new Date('2026-02-10T12:00:00Z').getTime();
    const formatted = formatPublishedDate(timestamp);
    expect(formatted).toBe('February 10, 2026');
  });

  it('handles different dates', () => {
    const timestamp = new Date('2025-12-25T12:00:00Z').getTime();
    const formatted = formatPublishedDate(timestamp);
    expect(formatted).toContain('December');
    expect(formatted).toContain('2025');
    expect(formatted).toContain('25');
  });
});

// ============================================================
// AuthorByline component tests
// ============================================================

describe('AuthorByline', () => {
  it('renders author name', () => {
    render(<AuthorByline {...defaultProps} />);
    expect(screen.getByTestId('author-name')).toHaveTextContent('Alice Admin');
  });

  it('renders author role', () => {
    render(<AuthorByline {...defaultProps} />);
    expect(screen.getByTestId('author-role')).toHaveTextContent('Admin');
  });

  it('renders formatted published date', () => {
    render(<AuthorByline {...defaultProps} />);
    expect(screen.getByTestId('published-date')).toHaveTextContent('February 10, 2026');
  });

  it('renders published date with correct datetime attribute', () => {
    render(<AuthorByline {...defaultProps} />);
    const timeEl = screen.getByTestId('published-date');
    expect(timeEl.tagName).toBe('TIME');
    expect(timeEl).toHaveAttribute('datetime');
  });

  it('renders reading time', () => {
    render(<AuthorByline {...defaultProps} />);
    expect(screen.getByTestId('reading-time')).toHaveTextContent('2 min read');
  });

  it('renders author initial avatar for known authors', () => {
    render(<AuthorByline {...defaultProps} />);
    expect(screen.getByText('A')).toBeInTheDocument();
  });

  it('renders question mark avatar for Unknown Author', () => {
    render(<AuthorByline {...defaultProps} authorName="Unknown Author" />);
    expect(screen.getByText('?')).toBeInTheDocument();
  });

  it('has correct test id', () => {
    render(<AuthorByline {...defaultProps} />);
    expect(screen.getByTestId('author-byline')).toBeInTheDocument();
  });

  it('renders different roles correctly', () => {
    render(<AuthorByline {...defaultProps} authorRole="Member" />);
    expect(screen.getByTestId('author-role')).toHaveTextContent('Member');
  });
});
