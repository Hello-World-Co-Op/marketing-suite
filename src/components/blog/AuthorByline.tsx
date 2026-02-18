/**
 * AuthorByline Component
 *
 * Displays author information for a blog post:
 * - Author avatar (default placeholder with initial)
 * - Author name
 * - Author role
 * - Published date (formatted with Intl.DateTimeFormat)
 * - Reading time (calculated from word count / 200)
 */

export interface AuthorBylineProps {
  /** Author display name */
  authorName: string;
  /** Author role (e.g., "Admin", "Author", "Member") */
  authorRole: string;
  /** Published timestamp in JS milliseconds */
  publishedAt: number;
  /** HTML body for reading time calculation */
  body: string;
}

/** Calculate reading time in minutes based on word count of HTML body */
// eslint-disable-next-line react-refresh/only-export-components
export function calculateReadingTime(htmlBody: string): number {
  // Strip HTML tags, then count words
  const textContent = htmlBody.replace(/<[^>]*>/g, ' ');
  const wordCount = textContent.trim().split(/\s+/).filter(Boolean).length;
  return Math.max(1, Math.ceil(wordCount / 200));
}

/** Format a JS millisecond timestamp to a locale-aware date string */
// eslint-disable-next-line react-refresh/only-export-components
export function formatPublishedDate(timestampMs: number): string {
  return new Intl.DateTimeFormat('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  }).format(new Date(timestampMs));
}

export default function AuthorByline({ authorName, authorRole, publishedAt, body }: AuthorBylineProps) {
  const readingTime = calculateReadingTime(body);
  const formattedDate = formatPublishedDate(publishedAt);
  const initial = authorName.charAt(0).toUpperCase();
  const isUnknown = authorName === 'Unknown Author';

  return (
    <div className="flex items-center gap-4 py-4" data-testid="author-byline">
      {/* Author avatar */}
      <div
        className="w-12 h-12 rounded-full bg-slate-600 flex items-center justify-center text-white font-semibold text-lg flex-shrink-0"
        aria-hidden="true"
      >
        {isUnknown ? '?' : initial}
      </div>

      {/* Author info */}
      <div className="flex flex-col">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="font-medium text-white" data-testid="author-name">
            {authorName}
          </span>
          <span className="text-slate-500" aria-hidden="true">&middot;</span>
          <span className="text-sm text-slate-400" data-testid="author-role">
            {authorRole}
          </span>
        </div>
        <div className="flex items-center gap-2 text-sm text-slate-400">
          <time dateTime={new Date(publishedAt).toISOString()} data-testid="published-date">
            {formattedDate}
          </time>
          <span aria-hidden="true">&middot;</span>
          <span data-testid="reading-time">{readingTime} min read</span>
        </div>
      </div>
    </div>
  );
}
