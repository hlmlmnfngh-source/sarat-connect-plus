import { createFileRoute, redirect } from "@tanstack/react-router";

// Shareable per-category URLs (e.g. /categories/programming) resolve
// to the main /services listing pre-filtered by that category slug.
export const Route = createFileRoute("/categories/$category")({
  beforeLoad: ({ params }) => {
    throw redirect({
      to: "/services",
      search: { category: params.category },
    });
  },
});