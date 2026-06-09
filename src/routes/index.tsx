import { createFileRoute } from "@tanstack/react-router";
import { Landing } from "@/components/site/Landing";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "سرعات — منصة الخدمات والمشاريع المستقلة" },
      { name: "description", content: "منصة سرعات تجمع الخدمات الجاهزة والمشاريع المخصصة. اشترِ خدمة جاهزة أو انشر مشروعك واستقبل عروض المستقلين العرب." },
      { property: "og:title", content: "سرعات — منصة الخدمات والمشاريع المستقلة" },
      { property: "og:description", content: "اعثر على الخدمة المثالية أو انشر مشروعك على أول منصة عربية موحّدة للعمل الحر." },
    ],
  }),
  component: Index,
});

function Index() {
  return <Landing />;
}
