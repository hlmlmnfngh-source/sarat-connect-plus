import { createFileRoute } from "@tanstack/react-router";
import { Landing } from "@/components/site/Landing";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "سرعات — سوق الخدمات الرقمية العربية" },
      { name: "description", content: "اكتشف خدمات رقمية جاهزة من مستقلين عرب، قارن الأسعار والباقات، واطلب الخدمة المناسبة بسهولة. المشاريع المخصصة متاحة كخيار إضافي." },
      { property: "og:title", content: "سرعات — سوق الخدمات الرقمية العربية" },
      { property: "og:description", content: "تصفح الخدمات الرقمية العربية، اختر الباقة المناسبة، وابدأ طلبك بثقة. ويمكنك أيضًا نشر مشروع مخصص عند الحاجة." },
    ],
  }),
  component: Index,
});

function Index() {
  return <Landing />;
}
