/**
 * PostContent Component
 *
 * Renders sanitized HTML blog post body with:
 * - Blog prose typography (blog-typography.css scoped under .blog-content)
 * - Syntax highlighting via highlight.js (code-split, lazy loaded)
 * - Always-visible copy button on code blocks
 * - Full-bleed code blocks on mobile
 * - Clean code copy (no line numbers or artifacts)
 */

import { useEffect, useRef, useState, useCallback } from 'react';
import '@/styles/blog-typography.css';

/** Extract clean text from a code block element, stripping artifacts */
export function extractCleanCode(codeElement: HTMLElement): string {
  // Clone the element to avoid modifying the DOM
  const clone = codeElement.cloneNode(true) as HTMLElement;

  // Remove any line number elements that might be injected
  clone.querySelectorAll('.hljs-ln-numbers, .line-number, [data-line-number]').forEach((el) => {
    el.remove();
  });

  // Get text content - preserves whitespace and indentation
  return clone.textContent || '';
}

export interface PostContentProps {
  /** HTML body of the blog post (from canister) */
  html: string;
}

/** Track which code blocks have been discovered after rendering */
interface CodeBlockEntry {
  index: number;
  text: string;
}

export default function PostContent({ html }: PostContentProps) {
  const contentRef = useRef<HTMLDivElement>(null);
  const [codeBlocks, setCodeBlocks] = useState<CodeBlockEntry[]>([]);
  const [copiedIndex, setCopiedIndex] = useState<number | null>(null);

  // Detect if there are code blocks that need highlighting
  const hasCodeBlocks = html.includes('<pre>') || html.includes('<code');

  // Code-split highlight.js: only load when code blocks exist
  useEffect(() => {
    if (!hasCodeBlocks || !contentRef.current) return;

    let cancelled = false;

    async function loadAndHighlight() {
      try {
        // Dynamic import for code-splitting
        const hljs = (await import('highlight.js/lib/core')).default;

        // Register only needed languages (4-5 per spec)
        const [typescript, rust, json, bash] = await Promise.all([
          import('highlight.js/lib/languages/typescript'),
          import('highlight.js/lib/languages/rust'),
          import('highlight.js/lib/languages/json'),
          import('highlight.js/lib/languages/bash'),
        ]);

        hljs.registerLanguage('typescript', typescript.default);
        hljs.registerLanguage('ts', typescript.default);
        hljs.registerLanguage('rust', rust.default);
        hljs.registerLanguage('json', json.default);
        hljs.registerLanguage('bash', bash.default);
        hljs.registerLanguage('sh', bash.default);

        if (cancelled || !contentRef.current) return;

        // Highlight all code blocks
        contentRef.current.querySelectorAll('pre code').forEach((block) => {
          hljs.highlightElement(block as HTMLElement);
        });
      } catch (err) {
        console.error('Failed to load highlight.js:', err);
      }

      // After highlighting (or on error), discover code blocks for copy buttons
      if (!cancelled) {
        discoverCodeBlocks();
      }
    }

    function discoverCodeBlocks() {
      if (!contentRef.current) return;

      const preElements = contentRef.current.querySelectorAll('pre');
      const blocks: CodeBlockEntry[] = [];

      preElements.forEach((pre, index) => {
        const codeEl = pre.querySelector('code');
        if (codeEl) {
          blocks.push({
            index,
            text: extractCleanCode(codeEl as HTMLElement),
          });
        }
      });

      setCodeBlocks(blocks);
    }

    loadAndHighlight();

    return () => {
      cancelled = true;
    };
  }, [html, hasCodeBlocks]);

  // Position copy buttons on pre elements via DOM manipulation after code blocks are discovered
  useEffect(() => {
    if (!contentRef.current || codeBlocks.length === 0) return;

    const preElements = contentRef.current.querySelectorAll('pre');
    preElements.forEach((pre) => {
      pre.style.position = 'relative';
    });
  }, [codeBlocks]);

  const handleCopy = useCallback(async (text: string, index: number) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopiedIndex(index);
      setTimeout(() => setCopiedIndex(null), 2000);
    } catch {
      // Fallback for older browsers
      const textarea = document.createElement('textarea');
      textarea.value = text;
      textarea.style.position = 'fixed';
      textarea.style.left = '-9999px';
      document.body.appendChild(textarea);
      textarea.select();
      document.execCommand('copy');
      document.body.removeChild(textarea);
      setCopiedIndex(index);
      setTimeout(() => setCopiedIndex(null), 2000);
    }
  }, []);

  return (
    <div className="post-content-wrapper relative">
      <div
        ref={contentRef}
        className="blog-content prose prose-lg prose-neutral dark:prose-invert"
        data-testid="post-content"
        dangerouslySetInnerHTML={{ __html: html }}
      />
      {/* Render copy buttons as an overlay positioned over each code block */}
      {codeBlocks.map(({ index, text }) => (
        <CopyButtonOverlay
          key={`copy-${index}`}
          index={index}
          text={text}
          copied={copiedIndex === index}
          onCopy={handleCopy}
          contentRef={contentRef}
        />
      ))}
    </div>
  );
}

/** Copy button that positions itself over the nth pre element */
function CopyButtonOverlay({
  index,
  text,
  copied,
  onCopy,
  contentRef,
}: {
  index: number;
  text: string;
  copied: boolean;
  onCopy: (text: string, index: number) => void;
  contentRef: React.RefObject<HTMLDivElement | null>;
}) {
  const [style, setStyle] = useState<React.CSSProperties>({ display: 'none' });

  useEffect(() => {
    if (!contentRef.current) return;

    const preElements = contentRef.current.querySelectorAll('pre');
    const pre = preElements[index];
    if (!pre) return;

    // Get position relative to the content wrapper
    const wrapperRect = contentRef.current.parentElement?.getBoundingClientRect();
    const preRect = pre.getBoundingClientRect();

    if (wrapperRect) {
      setStyle({
        position: 'absolute',
        top: `${preRect.top - wrapperRect.top + 8}px`,
        right: '8px',
        zIndex: 10,
      });
    }
  }, [index, contentRef]);

  return (
    <div style={style}>
      <button
        onClick={() => onCopy(text, index)}
        className="copy-code-btn px-2.5 py-1.5 text-xs font-medium rounded-md bg-slate-700 text-slate-300 hover:bg-slate-600 hover:text-white transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2 focus-visible:ring-offset-slate-900"
        aria-label={copied ? 'Copied to clipboard' : 'Copy code to clipboard'}
        type="button"
      >
        {copied ? (
          <span className="flex items-center gap-1">
            <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
            Copied!
          </span>
        ) : (
          <span className="flex items-center gap-1">
            <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
            </svg>
            Copy
          </span>
        )}
      </button>
    </div>
  );
}
