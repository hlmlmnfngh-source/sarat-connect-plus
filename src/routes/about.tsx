import { createFileRoute } from "@tanstack/react-router";
import { Target, Eye, HeartHandshake, Globe2, ShieldCheck, Rocket } from "lucide-react";
import { PageShell, PageHero } from "@/components/site/PageShell";
import { Card } from "@/components/ui/card";

export const Route = createFileRoute("/about")({
  head: () => ({
    meta: [
      { title: "من نحن — منصة سرعات" },
      { name: "description", content: "تعرّف على منصة سرعات: سوق العمل الحر العربي الذي يجمع الخدمات الجاهزة والمشاريع المخصصة في مكان واحد." },
      { property: "og:title", content: "من نحن — منصة سرعات" },
      { property: "og:description", content: "رؤيتنا ورسالتنا في بناء سوق العمل الحر العربي بمعايير عالمية." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: AboutPage,
});

const values = [
  { icon: Target, title: "رسالتنا", text: "تمكين المستقلين العرب من بناء مصدر دخل مستدام، وتمكين الشركات من الوصول لأفضل المواهب بسرعة وثقة." },
  { icon: Eye, title: "رؤيتنا", text: "أن نكون المنصة الأولى للعمل الحر في العالم العربي بمعايير عالمية في الجودة والأمان." },
  { icon: HeartHandshake, title: "قيمنا", text: "الشفافية في الأسعار، العدالة في العمولات، واحترام حقوق الطرفين في كل صفقة." },
  { icon: Globe2, title: "مجتمع عربي", text: "واجهة عربية بالكامل، دعم فني بلغتك، ومستقلون من كل الدول العربية." },
  { icon: ShieldCheck, title: "الأمان أولًا", text: "حماية المدفوعات عبر نظام الضمان، وتشفير كامل للبيانات والمحادثات." },
  { icon: Rocket, title: "سرعة التنفيذ", text: "خدمات جاهزة تُسلَّم خلال ٢٤ ساعة، ومشاريع مخصّصة تبدأ خلال دقائق." },
];

function AboutPage() {
  return (
    <PageShell>
      <PageHero title="من نحن" subtitle="سرعات منصة عربية تجمع الخدمات الجاهزة والمشاريع المخصصة في مكان واحد" />
      <div className="container mx-auto px-4 py-14 lg:px-6">
        <div className="mx-auto max-w-3xl space-y-4 text-center text-foreground/80">
          <p>
            وُلدت فكرة <strong>سرعات</strong> من ملاحظة بسيطة: المستقل العربي يضطر للتنقل بين منصتين — واحدة لبيع الخدمات
            الجاهزة، وأخرى للتقدّم على المشاريع. قررنا دمج التجربتين في منصة واحدة، بحساب واحد ومحفظة واحدة.
          </p>
          <p>
            اليوم تخدم سرعات آلاف المستقلين وأصحاب الأعمال، بنظام دفع آمن، وعمولة واضحة، ومجتمع يقدّر الجودة والاحترافية.
          </p>
        </div>

        <div className="mt-12 grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {values.map((v) => (
            <Card key={v.title} className="p-6">
              <div className="mb-4 flex h-11 w-11 items-center justify-center rounded-xl bg-gradient-accent text-accent-foreground">
                <v.icon className="h-5 w-5" />
              </div>
              <h3 className="mb-2 text-lg font-bold">{v.title}</h3>
              <p className="text-sm text-muted-foreground">{v.text}</p>
            </Card>
          ))}
        </div>

        <div className="mt-12 grid gap-6 rounded-2xl bg-muted p-8 text-center sm:grid-cols-3">
          {[
            { n: "+٥٠ ألف", l: "مستقل مسجّل" },
            { n: "+١٢٠ ألف", l: "خدمة منجزة" },
            { n: "٩٨٪", l: "رضا العملاء" },
          ].map((s) => (
            <div key={s.l}>
              <div className="text-3xl font-extrabold text-primary">{s.n}</div>
              <div className="mt-1 text-sm text-muted-foreground">{s.l}</div>
            </div>
          ))}
        </div>
      </div>
    </PageShell>
  );
}