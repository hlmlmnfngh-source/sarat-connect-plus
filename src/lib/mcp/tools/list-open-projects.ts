import { defineTool } from "@lovable.dev/mcp-js";
import { z } from "zod";
import { getPublicSupabase } from "../supabase";

export default defineTool({
  name: "list_open_projects",
  title: "List open buyer projects",
  description:
    "List buyer projects on Sarat that are open for freelancer proposals. Returns id, title, description, budget range, deadline_days, and required skills.",
  inputSchema: {
    limit: z
      .number()
      .int()
      .min(1)
      .max(50)
      .optional()
      .describe("Maximum number of projects to return. Defaults to 10."),
    skill: z
      .string()
      .trim()
      .optional()
      .describe("If set, only return projects whose required skills contain this value."),
  },
  annotations: { readOnlyHint: true, idempotentHint: true, openWorldHint: false },
  handler: async ({ limit, skill }) => {
    const supabase = getPublicSupabase();
    let q = supabase
      .from("projects")
      .select(
        "id, title, description, budget_min, budget_max, deadline_days, skills_required, proposals_count, created_at",
      )
      .eq("status", "open")
      .order("created_at", { ascending: false })
      .limit(limit ?? 10);
    if (skill) q = q.contains("skills_required", [skill]);
    const { data, error } = await q;
    if (error) {
      return { content: [{ type: "text", text: error.message }], isError: true };
    }
    return {
      content: [{ type: "text", text: JSON.stringify(data ?? [], null, 2) }],
      structuredContent: { projects: data ?? [] },
    };
  },
});