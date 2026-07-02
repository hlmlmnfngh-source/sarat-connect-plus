import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { ChevronDown } from "lucide-react";
import { PageShell, PageHero } from "@/components/site/PageShell";

export const Route = createFileRoute("/help")({
  head: () => ({ meta: [{ title: "مركز المساعدة — سرعات" }, { name: "description", content: "الأسئلة الشائعة ومساعدة استخدام منصة سرعات." }] }),
  component: HelpPage,
});

const faqs = [
  { q: "كيف أبدأ كبائع على سرعات؟", a: "سجّل حساباً جديداً، اختر دور البائع، أكمل ملفك الشخصي، ثم أضف أول خدمة لك من لوحة تحكم البائع." },
  { q: "كيف يتم الدفع؟", a: "ندعم بطاقات الائتمان عبر Stripe. تُحفظ المبالغ في ضمان المنصة وتُحوّل للبائع بعد استلام المشتري للعمل." },
  { q: "ما نسبة عمولة المنصة؟", a: "نسبة العمولة 20% من قيمة كل طلب مكتمل، وتُخصم تلقائياً عند تحويل الأرباح." },
  { q: "هل يمكنني استرجاع أموالي؟", a: "نعم، إذا لم يلتزم البائع بالمواصفات يمكن فتح نزاع خلال 3 أيام من التسليم لاسترجاع المبلغ." },
  { q: "كيف أطلب خدمة؟", a: "تصفّح الخدمات، اختر الباقة المناسبة، أكمل الدفع، ثم تابع تقدم الطلب من لوحة تحكم المشتري." },
  { q: "متى أستلم أرباحي؟", a: "تُحرّر الأرباح تلقائياً بعد قبول المشتري للعمل، ويمكن سحبها إلى حسابك البنكي أو محفظتك." },
];

function HelpPage() {
  const [open, setOpen] = useState<number | null>(0);
  return (
    <PageShell>
      <PageHero title="مركز المساعدة" subtitle="إجابات لأكثر الأسئلة شيوعاً حول منصة سرعات" />
      <section className="container mx-auto max-w-3xl px-4 py-14 lg:px-6">
        <div className="space-y-3">
          {faqs.map((f, i) => (
            <div key={i} className="overflow-hidden rounded-xl border border-border bg-card">
              <button onClick={() => setOpen(open === i ? null : i)} className="flex w-full items-center justify-between gap-3 px-5 py-4 text-right font-bold text-primary">
                <span>{f.q}</span>
                <ChevronDown className={`h-5 w-5 transition ${open === i ? "rotate-180" : ""}`} />
              </button>
              {open === i && <div className="border-t border-border px-5 py-4 text-sm leading-relaxed text-muted-foreground">{f.a}</div>}
            </div>
          ))}
        </div>
      </section>
    </PageShell>
  );
}