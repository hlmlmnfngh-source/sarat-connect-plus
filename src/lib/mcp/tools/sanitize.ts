// Sanitize free-text input before interpolating into a PostgREST .or() /
// .ilike filter. Strips filter delimiters (comma, parentheses, asterisk,
// colon, backslash) and escapes ilike wildcards so untrusted callers cannot
// inject extra OR clauses or wildcard patterns. Returns an empty string when
// nothing meaningful remains.
export function sanitizePostgrestFilterInput(input: string): string {
  return input
    .replace(/[,()*:\\]/g, " ")
    .replace(/%/g, "\\%")
    .replace(/_/g, "\\_")
    .trim();
}