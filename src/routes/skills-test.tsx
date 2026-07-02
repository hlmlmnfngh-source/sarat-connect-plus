import { createFileRoute } from "@tanstack/react-router";
import { Award, Clock, CheckCircle2 } from "lucide-react";
import { PageShell, PageHero } from "@/components/site/PageShell";
import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/skills-test")({
  head: () => ({ meta: [{ title: "اختبارات المهارات — سرعات" }, { name: "description", content: "اختبر مهاراتك واحصل على شهادة معتمدة." }] }),
  component: SkillsTestPage,
});

const tests = [
  { name: "تطوير الواجهات (React)", q: 40, m: 45, level: "متوسط" },
  { name: "تصميم واجهات المستخدم UI/UX", q: 35, m: 40, level: "متقدم" },
  { name: "التسويق الرقمي", q: 30, m: 30, level: "مبتدئ" },
  { name: "كتابة المحتوى", q: 25, m: 30, level: "متوسط" },
  { name: "الترجمة العربية-الإنجليزية", q: 30, m: 45, level: "متقدم" },
  { name: "SEO وتحسين محركات البحث", q: 30, m: 35, level: "متوسط" },
];

function SkillsTestPage() {
  return (
    <PageShell>
      <PageHero title="اختبارات المهارات" subtitle="أثبت خبرتك واحصل على شارة موثّقة تظهر في ملفك" />
      <section className="container mx-auto max-w-6xl px-4 py-14 lg:px-6">
        <div className="mb-10 grid gap-4 md:grid-cols-3">
          {[
            { I: Award, t: "شارة رسمية", d: "احصل على شارة تظهر في ملفك بعد النجاح" },
            { I: CheckCircle2, t: "زيادة الثقة", d: "المشترون يفضّلون البائعين المعتمدين" },
            { I: Clock, t: "اختبارات قصيرة", d: "معظم الاختبارات لا تتجاوز 45 دقيقة" },
          ].map((b) => (
            <div key={b.t} className="rounded-xl border border-border bg-card p-5">
              <b.I className="mb-3 h-8 w-8 text-accent" />
              <div className="font-extrabold text-primary">{b.t}</div>
              <div className="mt-1 text-sm text-muted-foreground">{b.d}</div>
            </div>
          ))}
        </div>
        <div className="grid gap-4 md:grid-cols-2">
          {tests.map((t) => (
            <div key={t.name} className="flex items-center justify-between gap-4 rounded-xl border border-border bg-card p-5">
              <div>
                <div className="font-extrabold text-primary">{t.name}</div>
                <div className="mt-1 flex gap-3 text-xs text-muted-foreground">
                  <span>{t.q} سؤال</span><span>•</span><span>{t.m} دقيقة</span><span>•</span><span>{t.level}</span>
                </div>
              </div>
              <Button variant="hero" size="default">ابدأ الاختبار</Button>
            </div>
          ))}
        </div>
      </section>
    </PageShell>
  );
}