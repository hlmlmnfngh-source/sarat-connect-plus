import { defineTool } from "@lovable.dev/mcp-js";
import { z } from "zod";
import { getPublicSupabase } from "../supabase";

export default defineTool({
  name: "search_services",
  title: "Search services",
  description:
    "Search active seller services on Sarat by keyword, sorted by rating. Returns id, title, description, price, delivery_days, rating, and reviews_count.",
  inputSchema: {
    query: z
      .string()
      .trim()
      .min(1)
      .describe("Free-text search matched against service title and description."),
    limit: z
      .number()
      .int()
      .min(1)
      .max(50)
      .optional()
      .describe("Maximum number of results to return. Defaults to 10."),
    quick_only: z
      .boolean()
      .optional()
      .describe("If true, only return quick (24h delivery) services."),
  },
  annotations: { readOnlyHint: true, idempotentHint: true, openWorldHint: false },
  handler: async ({ query, limit, quick_only }) => {
    const supabase = getPublicSupabase();
    let q = supabase
      .from("services")
      .select(
        "id, title, description, price, delivery_days, rating, reviews_count, is_quick",
      )
      .eq("status", "active")
      .or(`title.ilike.%${query}%,description.ilike.%${query}%`)
      .order("rating", { ascending: false, nullsFirst: false })
      .limit(limit ?? 10);
    if (quick_only) q = q.eq("is_quick", true);
    const { data, error } = await q;
    if (error) {
      return { content: [{ type: "text", text: error.message }], isError: true };
    }
    return {
      content: [{ type: "text", text: JSON.stringify(data ?? [], null, 2) }],
      structuredContent: { services: data ?? [] },
    };
  },
});