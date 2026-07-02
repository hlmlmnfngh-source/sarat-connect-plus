import { createFileRoute } from "@tanstack/react-router";
import { PageShell, PageHero } from "@/components/site/PageShell";

export const Route = createFileRoute("/privacy")({
  head: () => ({ meta: [{ title: "سياسة الخصوصية — سرعات" }, { name: "description", content: "كيف نجمع ونستخدم ونحمي بياناتك." }] }),
  component: () => (
    <PageShell>
      <PageHero title="سياسة الخصوصية" subtitle="خصوصيتك أولوية قصوى لدينا" />
      <section className="container mx-auto max-w-3xl space-y-4 px-4 py-14 lg:px-6">
        {items.map((s) => (
          <div key={s.h} className="rounded-xl border border-border bg-card p-6">
            <h2 className="mb-3 text-xl font-extrabold text-primary">{s.h}</h2>
            <p className="text-sm leading-relaxed text-muted-foreground">{s.p}</p>
          </div>
        ))}
      </section>
    </PageShell>
  ),
});

const items = [
  { h: "البيانات التي نجمعها", p: "نجمع البيانات التي تقدمها عند التسجيل (الاسم، البريد، الصورة) وبيانات الاستخدام التقنية." },
  { h: "كيف نستخدم البيانات", p: "لتحسين تجربتك، معالجة الطلبات، إرسال الإشعارات، والتحليلات الداخلية فقط." },
  { h: "مشاركة البيانات", p: "لا نبيع بياناتك. نشاركها فقط مع مزودي الخدمة الضروريين (Stripe للمدفوعات)." },
  { h: "الأمان", p: "نستخدم تشفير TLS وسياسات RLS على قاعدة البيانات لضمان أن كل مستخدم يرى بياناته فقط." },
  { h: "حقوقك", p: "يمكنك طلب الاطلاع على بياناتك، تعديلها، أو حذف حسابك بشكل نهائي عبر مركز الدعم." },
];