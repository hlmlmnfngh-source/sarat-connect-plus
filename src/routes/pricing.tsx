import { createFileRoute, Link } from "@tanstack/react-router";
import { Check } from "lucide-react";
import { PageShell, PageHero } from "@/components/site/PageShell";
import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/pricing")({
  head: () => ({ meta: [{ title: "الأسعار — سرعات" }, { name: "description", content: "باقات اشتراك سرعات للبائعين والمشترين." }] }),
  component: PricingPage,
});

const plans = [
  { name: "المجاني", price: "0", tag: "للبدء", features: ["نشر حتى 3 خدمات", "عمولة 20%", "دعم أساسي", "ملف شخصي عام"], cta: "ابدأ مجاناً", highlight: false },
  { name: "المحترف", price: "19", tag: "الأكثر شعبية", features: ["خدمات غير محدودة", "عمولة 15%", "دعم أولوية", "شارة موثّق", "ظهور مميز في نتائج البحث"], cta: "اشترك الآن", highlight: true },
  { name: "الأعمال", price: "49", tag: "للفرق", features: ["كل مزايا المحترف", "عمولة 10%", "حساب فريق (5 أعضاء)", "مدير حساب مخصص", "تقارير تحليلية شاملة"], cta: "تواصل معنا", highlight: false },
];

function PricingPage() {
  return (
    <PageShell>
      <PageHero title="خطط الاشتراك" subtitle="اختر الخطة المناسبة لتنمية أعمالك على سرعات" />
      <section className="container mx-auto max-w-6xl px-4 py-14 lg:px-6">
        <div className="grid gap-6 md:grid-cols-3">
          {plans.map((p) => (
            <div key={p.name} className={`relative rounded-2xl border-2 bg-card p-8 shadow-soft ${p.highlight ? "border-accent md:scale-105" : "border-border"}`}>
              {p.highlight && <span className="absolute -top-3 right-1/2 translate-x-1/2 rounded-full bg-accent px-3 py-1 text-xs font-bold text-accent-foreground">{p.tag}</span>}
              <h3 className="text-xl font-extrabold text-primary">{p.name}</h3>
              <div className="my-5 flex items-baseline gap-1">
                <span className="text-5xl font-extrabold text-primary">${p.price}</span>
                <span className="text-muted-foreground">/شهرياً</span>
              </div>
              <ul className="mb-6 space-y-3">
                {p.features.map((f) => (
                  <li key={f} className="flex items-start gap-2 text-sm">
                    <Check className="mt-0.5 h-4 w-4 shrink-0 text-success" /> {f}
                  </li>
                ))}
              </ul>
              <Link to="/auth" className="block">
                <Button variant={p.highlight ? "hero" : "navy"} size="lg" className="w-full">{p.cta}</Button>
              </Link>
            </div>
          ))}
        </div>
      </section>
    </PageShell>
  );
}