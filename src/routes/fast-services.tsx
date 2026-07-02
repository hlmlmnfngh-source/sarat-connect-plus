import { createFileRoute, Link } from "@tanstack/react-router";
import { Zap, Clock, Star } from "lucide-react";
import { PageShell, PageHero } from "@/components/site/PageShell";

export const Route = createFileRoute("/fast-services")({
  head: () => ({ meta: [{ title: "خدمات سريعة — سرعات" }, { name: "description", content: "خدمات تُسلّم خلال 24 ساعة." }] }),
  component: FastServicesPage,
});

const services = [
  { t: "تصميم شعار احترافي", p: 35, r: 4.9, seller: "أحمد الغامدي" },
  { t: "كتابة مقال SEO 1000 كلمة", p: 25, r: 4.8, seller: "سارة المطيري" },
  { t: "تصميم بوستات سوشيال ميديا × 5", p: 40, r: 5.0, seller: "محمد العبدلي" },
  { t: "ترجمة نص حتى 2000 كلمة", p: 30, r: 4.9, seller: "ليلى حسن" },
  { t: "مونتاج فيديو قصير", p: 45, r: 4.7, seller: "خالد يوسف" },
  { t: "تصميم عرض تقديمي 15 شريحة", p: 50, r: 4.9, seller: "نورة السالم" },
  { t: "تفريغ صوتي (ساعة)", p: 20, r: 4.8, seller: "عبدالله الشهري" },
  { t: "تصميم منشور إنستقرام", p: 15, r: 4.9, seller: "ريم القحطاني" },
];

function FastServicesPage() {
  return (
    <PageShell>
      <PageHero title="خدمات سريعة ⚡" subtitle="خدمات تُسلَّم خلال 24 ساعة أو أقل" />
      <section className="container mx-auto max-w-6xl px-4 py-14 lg:px-6">
        <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {services.map((s, i) => (
            <Link key={i} to="/services" className="group rounded-2xl border border-border bg-card p-5 shadow-soft transition hover:shadow-glow">
              <div className="mb-3 flex items-center justify-between">
                <span className="flex items-center gap-1 rounded-full bg-accent/10 px-2.5 py-1 text-xs font-bold text-accent">
                  <Zap className="h-3 w-3" /> 24 ساعة
                </span>
                <span className="flex items-center gap-1 text-xs font-bold text-warning">
                  <Star className="h-3 w-3 fill-current" /> {s.r}
                </span>
              </div>
              <h3 className="text-base font-extrabold text-primary group-hover:text-accent">{s.t}</h3>
              <p className="mt-1 text-xs text-muted-foreground">بواسطة {s.seller}</p>
              <div className="mt-4 flex items-center justify-between border-t border-border pt-3">
                <span className="flex items-center gap-1 text-xs text-muted-foreground">
                  <Clock className="h-3 w-3" /> تسليم سريع
                </span>
                <span className="text-lg font-extrabold text-primary">${s.p}</span>
              </div>
            </Link>
          ))}
        </div>
      </section>
    </PageShell>
  );
}