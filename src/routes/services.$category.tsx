import { createFileRoute, redirect } from "@tanstack/react-router";

// Per-category URLs like /services/programming resolve to the main
// listing filtered by that category slug. Keeps a single implementation
// while giving each category its own shareable URL.
export const Route = createFileRoute("/services/$category")({
  beforeLoad: ({ params }) => {
    throw redirect({
      to: "/services",
      search: { category: params.category },
    });
  },
});