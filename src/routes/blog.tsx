import { createFileRoute } from "@tanstack/react-router";
import { Calendar, User } from "lucide-react";
import { PageShell, PageHero } from "@/components/site/PageShell";

export const Route = createFileRoute("/blog")({
  head: () => ({ meta: [{ title: "المدونة — سرعات" }, { name: "description", content: "مقالات ونصائح للعمل الحر." }] }),
  component: BlogPage,
});

const posts = [
  { t: "5 نصائح لكتابة وصف خدمة يجذب العملاء", d: "تعلم كيف تحوّل زوار خدمتك إلى مشترين فعليين.", a: "فريق سرعات", date: "28 يونيو 2026", cat: "تسويق" },
  { t: "كيف تسعّر خدماتك بشكل احترافي", d: "استراتيجيات التسعير التي يستخدمها كبار المستقلين.", a: "أحمد الشمري", date: "20 يونيو 2026", cat: "أعمال" },
  { t: "دليلك الشامل لبناء ملف أعمال قوي", d: "خطوات عملية لبناء بورتفوليو يعكس مهاراتك.", a: "سارة العتيبي", date: "15 يونيو 2026", cat: "تصميم" },
  { t: "أهم مهارات 2026 المطلوبة في السوق العربي", d: "قائمة بالمهارات التقنية والإبداعية الأعلى طلباً.", a: "فريق سرعات", date: "10 يونيو 2026", cat: "مهارات" },
  { t: "كيف تتعامل مع العملاء الصعبين؟", d: "استراتيجيات ذكية للحفاظ على مهنيتك.", a: "محمد الغامدي", date: "5 يونيو 2026", cat: "مهارات ناعمة" },
  { t: "الذكاء الاصطناعي وفرص العمل الحر", d: "كيف يغيّر AI مشهد المستقلين وما الفرص الجديدة.", a: "ليلى حسن", date: "1 يونيو 2026", cat: "تقنية" },
];

function BlogPage() {
  return (
    <PageShell>
      <PageHero title="مدونة سرعات" subtitle="نصائح ومقالات لتطوير مسيرتك في العمل الحر" />
      <section className="container mx-auto max-w-6xl px-4 py-14 lg:px-6">
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {posts.map((p, i) => (
            <article key={i} className="group cursor-pointer overflow-hidden rounded-2xl border border-border bg-card shadow-soft transition hover:shadow-glow">
              <div className="flex h-40 items-center justify-center bg-gradient-to-br from-primary to-accent text-4xl font-extrabold text-accent-foreground">
                {p.cat[0]}
              </div>
              <div className="p-5">
                <span className="inline-block rounded-full bg-accent/10 px-2.5 py-0.5 text-xs font-bold text-accent">{p.cat}</span>
                <h3 className="mt-3 text-lg font-extrabold text-primary group-hover:text-accent">{p.t}</h3>
                <p className="mt-2 text-sm text-muted-foreground">{p.d}</p>
                <div className="mt-4 flex items-center gap-4 text-xs text-muted-foreground">
                  <span className="flex items-center gap-1"><User className="h-3 w-3" /> {p.a}</span>
                  <span className="flex items-center gap-1"><Calendar className="h-3 w-3" /> {p.date}</span>
                </div>
              </div>
            </article>
          ))}
        </div>
      </section>
    </PageShell>
  );
}