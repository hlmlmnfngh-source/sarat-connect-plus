import { createFileRoute } from "@tanstack/react-router";
import { PageShell, PageHero } from "@/components/site/PageShell";
import { ServiceForm } from "@/components/site/ServiceForm";

export const Route = createFileRoute("/services/create")({
  head: () => ({
    meta: [
      { title: "أضف خدمة جديدة — سرعات" },
      { name: "description", content: "انشر خدمتك على سرعات وحدد السعر ومدة التسليم والمميزات لتصل لآلاف المشترين." },
      { property: "og:title", content: "أضف خدمة جديدة — سرعات" },
      { property: "og:description", content: "انشر خدمتك واربح من مهاراتك على منصة سرعات." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: () => (
    <PageShell>
      <PageHero title="أضف خدمة جديدة" subtitle="اكتب تفاصيل واضحة لتزيد فرص بيع خدمتك" />
      <ServiceForm />
    </PageShell>
  ),
});