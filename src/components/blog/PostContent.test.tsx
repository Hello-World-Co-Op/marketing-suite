import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor, act, fireEvent } from '@testing-library/react';
import PostContent, { extractCleanCode } from './PostContent';

// ============================================================
// Mock highlight.js (code-split import)
// ============================================================

const mockHighlightElement = vi.fn();
const mockRegisterLanguage = vi.fn();

vi.mock('highlight.js/lib/core', () => ({
  default: {
    highlightElement: (...args: unknown[]) => mockHighlightElement(...args),
    registerLanguage: (...args: unknown[]) => mockRegisterLanguage(...args),
  },
}));

vi.mock('highlight.js/lib/languages/typescript', () => ({ default: vi.fn() }));
vi.mock('highlight.js/lib/languages/rust', () => ({ default: vi.fn() }));
vi.mock('highlight.js/lib/languages/json', () => ({ default: vi.fn() }));
vi.mock('highlight.js/lib/languages/bash', () => ({ default: vi.fn() }));

// ============================================================
// Mock clipboard API
// ============================================================

const mockWriteText = vi.fn().mockResolvedValue(undefined);

beforeEach(() => {
  vi.clearAllMocks();
  // Use Object.defineProperty since navigator.clipboard is a getter-only property in jsdom
  Object.defineProperty(navigator, 'clipboard', {
    value: {
      writeText: mockWriteText,
    },
    writable: true,
    configurable: true,
  });
});

// ============================================================
// extractCleanCode tests
// ============================================================

describe('extractCleanCode', () => {
  it('extracts text content from a code element', () => {
    const code = document.createElement('code');
    code.textContent = 'const x = 1;';
    expect(extractCleanCode(code)).toBe('const x = 1;');
  });

  it('removes line number elements', () => {
    const code = document.createElement('code');
    code.innerHTML = '<span class="hljs-ln-numbers">1</span>const x = 1;';
    expect(extractCleanCode(code)).toBe('const x = 1;');
  });

  it('removes data-line-number elements', () => {
    const code = document.createElement('code');
    code.innerHTML = '<span data-line-number="1">1</span>const x = 1;';
    expect(extractCleanCode(code)).toBe('const x = 1;');
  });

  it('preserves whitespace and indentation', () => {
    const code = document.createElement('code');
    code.textContent = 'function foo() {\n  return 42;\n}';
    expect(extractCleanCode(code)).toBe('function foo() {\n  return 42;\n}');
  });

  it('handles empty code element', () => {
    const code = document.createElement('code');
    expect(extractCleanCode(code)).toBe('');
  });

  it('does not modify the original element', () => {
    const code = document.createElement('code');
    code.innerHTML = '<span class="line-number">1</span>original';
    extractCleanCode(code);
    // Original should still have the line number span
    expect(code.querySelector('.line-number')).not.toBeNull();
  });
});

// ============================================================
// PostContent rendering tests
// ============================================================

describe('PostContent', () => {
  it('renders HTML content', () => {
    render(<PostContent html="<p>Hello World</p>" />);
    expect(screen.getByTestId('post-content')).toBeInTheDocument();
    expect(screen.getByText('Hello World')).toBeInTheDocument();
  });

  it('applies blog-content CSS class', () => {
    render(<PostContent html="<p>Test</p>" />);
    const content = screen.getByTestId('post-content');
    expect(content).toHaveClass('blog-content');
    expect(content).toHaveClass('prose');
    expect(content).toHaveClass('prose-lg');
    expect(content).toHaveClass('prose-neutral');
  });

  it('renders headings from HTML', () => {
    render(<PostContent html="<h2>Section Title</h2><p>Content here</p>" />);
    expect(screen.getByText('Section Title')).toBeInTheDocument();
  });

  it('renders links from HTML', () => {
    render(<PostContent html='<p>Visit <a href="https://example.com">Example</a></p>' />);
    const link = screen.getByText('Example');
    expect(link.closest('a')).toHaveAttribute('href', 'https://example.com');
  });

  it('renders blockquotes from HTML', () => {
    render(<PostContent html="<blockquote><p>A wise quote</p></blockquote>" />);
    expect(screen.getByText('A wise quote')).toBeInTheDocument();
  });

  it('renders lists from HTML', () => {
    render(<PostContent html="<ul><li>Item 1</li><li>Item 2</li></ul>" />);
    expect(screen.getByText('Item 1')).toBeInTheDocument();
    expect(screen.getByText('Item 2')).toBeInTheDocument();
  });

  it('renders images', () => {
    render(<PostContent html='<img src="https://example.com/img.jpg" alt="Test image" />' />);
    const img = screen.getByAltText('Test image');
    expect(img).toBeInTheDocument();
  });
});

// ============================================================
// Code highlighting tests
// ============================================================

describe('PostContent - code highlighting', () => {
  it('loads highlight.js when code blocks exist', async () => {
    await act(async () => {
      render(<PostContent html='<pre><code class="language-typescript">const x = 1;</code></pre>' />);
    });

    await waitFor(() => {
      expect(mockRegisterLanguage).toHaveBeenCalled();
    });
  });

  it('registers 4 core languages plus aliases', async () => {
    await act(async () => {
      render(<PostContent html='<pre><code>code</code></pre>' />);
    });

    await waitFor(() => {
      expect(mockRegisterLanguage).toHaveBeenCalledWith('typescript', expect.any(Function));
      expect(mockRegisterLanguage).toHaveBeenCalledWith('rust', expect.any(Function));
      expect(mockRegisterLanguage).toHaveBeenCalledWith('json', expect.any(Function));
      expect(mockRegisterLanguage).toHaveBeenCalledWith('bash', expect.any(Function));
    });
  });

  it('calls highlightElement on code blocks', async () => {
    await act(async () => {
      render(<PostContent html='<pre><code>const x = 1;</code></pre>' />);
    });

    await waitFor(() => {
      expect(mockHighlightElement).toHaveBeenCalled();
    });
  });

  it('does not load highlight.js when no code blocks exist', () => {
    render(<PostContent html="<p>No code here</p>" />);
    expect(mockRegisterLanguage).not.toHaveBeenCalled();
    expect(mockHighlightElement).not.toHaveBeenCalled();
  });
});

// ============================================================
// Copy button tests
// ============================================================

describe('PostContent - copy button', () => {
  it('renders copy buttons for code blocks', async () => {
    await act(async () => {
      render(<PostContent html='<pre><code>const x = 1;</code></pre>' />);
    });

    await waitFor(() => {
      const copyBtn = screen.getByLabelText('Copy code to clipboard');
      expect(copyBtn).toBeInTheDocument();
    });
  });

  it('copy button is always visible (not hover-only)', async () => {
    await act(async () => {
      render(<PostContent html='<pre><code>const x = 1;</code></pre>' />);
    });

    await waitFor(() => {
      const copyBtn = screen.getByLabelText('Copy code to clipboard');
      expect(copyBtn).toBeInTheDocument();
      // Button should be a visible button element (not hidden)
      expect(copyBtn.tagName).toBe('BUTTON');
    });
  });

  it('copy button is keyboard accessible', async () => {
    await act(async () => {
      render(<PostContent html='<pre><code>const x = 1;</code></pre>' />);
    });

    await waitFor(() => {
      const copyBtn = screen.getByLabelText('Copy code to clipboard');
      expect(copyBtn.tagName).toBe('BUTTON');
      expect(copyBtn).toHaveAttribute('type', 'button');
    });
  });

  it('clicking copy button copies text to clipboard', async () => {
    await act(async () => {
      render(<PostContent html='<pre><code>const x = 1;</code></pre>' />);
    });

    await waitFor(() => {
      expect(screen.getByLabelText('Copy code to clipboard')).toBeInTheDocument();
    });

    await act(async () => {
      fireEvent.click(screen.getByLabelText('Copy code to clipboard'));
    });

    await waitFor(() => {
      expect(mockWriteText).toHaveBeenCalledWith('const x = 1;');
    });
  });

  it('shows "Copied!" feedback after copying', async () => {
    await act(async () => {
      render(<PostContent html='<pre><code>const x = 1;</code></pre>' />);
    });

    await waitFor(() => {
      expect(screen.getByLabelText('Copy code to clipboard')).toBeInTheDocument();
    });

    await act(async () => {
      fireEvent.click(screen.getByLabelText('Copy code to clipboard'));
    });

    await waitFor(() => {
      expect(screen.getByText('Copied!')).toBeInTheDocument();
    });
  });

  it('renders multiple copy buttons for multiple code blocks', async () => {
    await act(async () => {
      render(
        <PostContent
          html='<pre><code>block 1</code></pre><p>text</p><pre><code>block 2</code></pre>'
        />,
      );
    });

    await waitFor(() => {
      const copyButtons = screen.getAllByLabelText('Copy code to clipboard');
      expect(copyButtons).toHaveLength(2);
    });
  });
});
