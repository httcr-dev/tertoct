import DOMPurify from 'isomorphic-dompurify';

/**
 * Sanitizes input strings by removing unsafe HTML tags and script injections.
 * Allows basic formatting if needed, but strips out scripts, iframes, etc.
 */
export function sanitizeHtml(input: string | null | undefined): string {
  if (typeof input !== 'string') return '';
  return DOMPurify.sanitize(input, {
    ALLOWED_TAGS: ['b', 'i', 'em', 'strong', 'a', 'p', 'br', 'ul', 'li', 'ol'],
    ALLOWED_ATTR: ['href', 'target', 'rel'],
  }).trim();
}

/**
 * Strips all HTML tags, leaving only pure safe text.
 */
export function stripHtml(input: string | null | undefined): string {
  if (typeof input !== 'string') return '';
  return DOMPurify.sanitize(input, {
    ALLOWED_TAGS: [], // No tags allowed
    ALLOWED_ATTR: [],
  }).trim();
}
