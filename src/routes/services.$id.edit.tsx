import { createFileRoute } from "@tanstack/react-router";
import { PageShell, PageHero } from "@/components/site/PageShell";
import { ServiceForm } from "@/components/site/ServiceForm";

export const Route = createFileRoute("/services/$id/edit")({
  head: () => ({
    meta: [
      { title: "تعديل الخدمة — سرعات" },
      { name: "description", content: "عدّل تفاصيل خدمتك على سرعات: السعر، مدة التسليم، المميزات وحالة النشر." },
      { property: "og:title", content: "تعديل الخدمة — سرعات" },
      { property: "og:description", content: "حدّث بيانات خدمتك المنشورة على منصة سرعات." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: EditServicePage,
});

function EditServicePage() {
  const { id } = Route.useParams();
  return (
    <PageShell>
      <PageHero title="تعديل الخدمة" subtitle="حدّث تفاصيل خدمتك المنشورة" />
      <ServiceForm serviceId={id} />
    </PageShell>
  );
}