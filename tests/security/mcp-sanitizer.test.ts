import { describe, expect, it } from "vitest";
import { sanitizePostgrestFilterInput } from "@/lib/mcp/tools/sanitize";

describe("sanitizePostgrestFilterInput", () => {
  it("passes plain queries through unchanged", () => {
    expect(sanitizePostgrestFilterInput("logo design")).toBe("logo design");
  });

  it("strips PostgREST filter delimiters that could inject OR clauses", () => {
    // Attempt: close the ilike wildcard and inject another filter.
    const attack = "logo),status.eq.draft,or(price.gt.0";
    const cleaned = sanitizePostgrestFilterInput(attack);
    expect(cleaned).not.toMatch(/[,()*:\\]/);
  });

  it("escapes ilike wildcards so % and _ cannot broaden the match", () => {
    const cleaned = sanitizePostgrestFilterInput("100%_off");
    expect(cleaned).toContain("\\%");
    expect(cleaned).toContain("\\_");
    expect(cleaned).not.toMatch(/(^|[^\\])%/);
    expect(cleaned).not.toMatch(/(^|[^\\])_/);
  });

  it("returns empty string when the input becomes meaningless after sanitization", () => {
    expect(sanitizePostgrestFilterInput(",,()")).toBe("");
  });
});