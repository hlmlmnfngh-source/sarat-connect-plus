// Sanitize free-text input before interpolating into a PostgREST .or() /
// .ilike filter. Strips filter delimiters and escapes ilike wildcards so
// untrusted callers cannot inject extra OR clauses or wildcard patterns.
export function sanitizePostgrestFilterInput(input: string): string {
  return input
    .replace(/[,()*:\\]/g, " ")
    .replace(/%/g, "\\%")
    .replace(/_/g, "\\_")
    .trim();
}
