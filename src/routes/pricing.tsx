import { createFileRoute } from "@tanstack/react-router";
import { Check } from "lucide-react";
import { PageShell, PageHero } from "@/components/site/PageShell";
import { Button } from "@/components/ui/button";
import { Link } from "@tanstack/react-router";

export const Route = createFileRoute("/pricing")({
  head: () => ({ meta: [{ title: "الأسعار والعمولة — سرعات" }, { name: "description", content: "لا توجد اشتراكات شهرية؛ عمولة المنصة 20% على كل طلب مكتمل." }] }),
  component: PricingPage,
});

function PricingPage() {
  return (
    <PageShell>
      <PageHero title="أسعار واضحة وبسيطة" subtitle="ابدأ دون اشتراك شهري، وادفع عمولة المنصة عند اكتمال الطلب فقط." />
      <section className="container mx-auto max-w-3xl px-4 py-14 lg:px-6">
        <div className="rounded-2xl border border-border bg-card p-8 shadow-soft md:p-10">
          <p className="text-sm font-bold text-accent">الخطة الوحيدة</p>
          <h2 className="mt-2 text-2xl font-extrabold text-primary">بدون اشتراك</h2>
          <div className="my-5 flex items-baseline gap-2">
            <span className="text-5xl font-extrabold text-primary">0$</span>
            <span className="text-muted-foreground">رسوم شهرية</span>
          </div>
          <div className="mb-6 rounded-xl bg-muted p-5">
            <p className="text-sm text-muted-foreground">عمولة المنصة</p>
            <p className="mt-1 text-3xl font-extrabold text-primary">20% <span className="text-base font-medium">من قيمة كل طلب مكتمل</span></p>
          </div>
          <ul className="mb-8 space-y-3">
            {["لا توجد باقات اشتراك مدفوعة", "تُحتسب العمولة بنسبة ثابتة 20% على الطلب المكتمل", "لا توجد خصومات عمولة مرتبطة بخطط اشتراك"].map((feature) => (
              <li key={feature} className="flex items-start gap-2 text-sm">
                <Check className="mt-0.5 h-4 w-4 shrink-0 text-success" /> {feature}
              </li>
            ))}
          </ul>
          <Link to="/auth" className="block"><Button variant="hero" size="lg" className="w-full">ابدأ الآن</Button></Link>
        </div>
      </section>
    </PageShell>
  );
}
