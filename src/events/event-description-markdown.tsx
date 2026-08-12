import { lazy, Suspense } from 'react';

// XSS-safe markdown renderer for an Event `description`. react-markdown does NOT emit
// raw HTML by default (no rehype-raw), so embedded <script>/HTML is escaped, not run.
// Hardening on top of that default:
//   • allowedElements allowlist — anything outside the set is dropped (defense in depth);
//   • every link opens in a new tab with rel="noopener noreferrer" (anti tab-nabbing).
// Both react-markdown + remark-gfm are lazy-loaded so they stay off the first-paint
// critical path — only this detail view pays for them.

// Safe subset: text formatting, lists, GFM tables/strikethrough/task-lists, links, images.
const ALLOWED_ELEMENTS = [
  'p', 'br', 'strong', 'em', 'del', 'a', 'img',
  'ul', 'ol', 'li',
  'h1', 'h2', 'h3', 'h4', 'h5', 'h6',
  'blockquote', 'code', 'pre', 'hr',
  'table', 'thead', 'tbody', 'tr', 'th', 'td',
];

const LazyMarkdown = lazy(async () => {
  const [{ default: ReactMarkdown }, { default: remarkGfm }] = await Promise.all([
    import('react-markdown'),
    import('remark-gfm'),
  ]);
  function Rendered({ text }: { text: string }) {
    return (
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        allowedElements={ALLOWED_ELEMENTS}
        unwrapDisallowed
        components={{
          a({ node: _node, ...props }) {
            return <a {...props} target="_blank" rel="noopener noreferrer" />;
          },
        }}
      >
        {text}
      </ReactMarkdown>
    );
  }
  return { default: Rendered };
});

export function EventDescriptionMarkdown({ text }: { text: string }) {
  if (!text || !text.trim()) return null;
  return (
    <div className="event-desc">
      <Suspense fallback={<p className="text-sm text-muted">Loading…</p>}>
        <LazyMarkdown text={text} />
      </Suspense>
    </div>
  );
}
