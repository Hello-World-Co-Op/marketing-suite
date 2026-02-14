/**
 * SocialShareButtons Component
 *
 * Renders social sharing buttons for a blog post:
 * - Twitter (X): opens intent/tweet URL with title + URL
 * - LinkedIn: opens sharing/share-offsite URL
 * - Copy link: copies URL to clipboard with success toast
 *
 * Accessibility: aria-labels, keyboard navigable, visible focus indicators.
 * No third-party social libraries — native share URLs only (zero bundle cost).
 */

import { useCallback, useState } from 'react';

export interface SocialShareButtonsProps {
  postTitle: string;
  postUrl: string;
}

export default function SocialShareButtons({ postTitle, postUrl }: SocialShareButtonsProps) {
  const [copied, setCopied] = useState(false);

  const twitterUrl = `https://twitter.com/intent/tweet?text=${encodeURIComponent(postTitle)}&url=${encodeURIComponent(postUrl)}`;
  const linkedInUrl = `https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(postUrl)}`;

  const handleCopyLink = useCallback(async () => {
    try {
      await navigator.clipboard.writeText(postUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Fallback: show error state briefly
      setCopied(false);
    }
  }, [postUrl]);

  return (
    <div className="flex flex-wrap gap-3" data-testid="social-share-buttons">
      {/* Twitter/X share button */}
      <a
        href={twitterUrl}
        target="_blank"
        rel="noopener noreferrer"
        aria-label="Share on Twitter"
        className="inline-flex items-center gap-2 border border-gray-300 hover:border-gray-400 text-gray-700 dark:border-slate-600 dark:hover:border-slate-500 dark:text-slate-300 py-2 px-4 rounded-lg transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500"
        data-testid="share-twitter"
      >
        <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
          <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
        </svg>
        <span className="text-sm font-medium">Twitter</span>
      </a>

      {/* LinkedIn share button */}
      <a
        href={linkedInUrl}
        target="_blank"
        rel="noopener noreferrer"
        aria-label="Share on LinkedIn"
        className="inline-flex items-center gap-2 border border-gray-300 hover:border-gray-400 text-gray-700 dark:border-slate-600 dark:hover:border-slate-500 dark:text-slate-300 py-2 px-4 rounded-lg transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500"
        data-testid="share-linkedin"
      >
        <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
          <path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433c-1.144 0-2.063-.926-2.063-2.065 0-1.138.92-2.063 2.063-2.063 1.14 0 2.064.925 2.064 2.063 0 1.139-.925 2.065-2.064 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z" />
        </svg>
        <span className="text-sm font-medium">LinkedIn</span>
      </a>

      {/* Copy link button */}
      <button
        onClick={handleCopyLink}
        aria-label="Copy link"
        className="inline-flex items-center gap-2 border border-gray-300 hover:border-gray-400 text-gray-700 dark:border-slate-600 dark:hover:border-slate-500 dark:text-slate-300 py-2 px-4 rounded-lg transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500"
        data-testid="share-copy-link"
      >
        {copied ? (
          <>
            <svg className="w-4 h-4 text-green-500" viewBox="0 0 24 24" fill="none" stroke="currentColor" aria-hidden="true">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
            <span className="text-sm font-medium text-green-500" data-testid="copy-success">Link copied!</span>
          </>
        ) : (
          <>
            <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" aria-hidden="true">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 5H6a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2v-1M8 5a2 2 0 002 2h2a2 2 0 002-2M8 5a2 2 0 012-2h2a2 2 0 012 2m0 0h2a2 2 0 012 2v3m2 4H10m0 0l3-3m-3 3l3 3" />
            </svg>
            <span className="text-sm font-medium">Copy link</span>
          </>
        )}
      </button>
    </div>
  );
}
