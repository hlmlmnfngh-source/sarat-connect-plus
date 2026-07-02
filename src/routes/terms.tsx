import { createFileRoute } from "@tanstack/react-router";
import { PageShell, PageHero } from "@/components/site/PageShell";

export const Route = createFileRoute("/terms")({
  head: () => ({ meta: [{ title: "الشروط والأحكام — سرعات" }, { name: "description", content: "شروط وأحكام استخدام منصة سرعات." }] }),
  component: () => (
    <PageShell>
      <PageHero title="الشروط والأحكام" subtitle="آخر تحديث: 1 يوليو 2026" />
      <section className="container mx-auto max-w-3xl px-4 py-14 lg:px-6">
        <article className="prose prose-slate max-w-none space-y-6 text-right leading-relaxed text-foreground">
          {sections.map((s) => (
            <div key={s.h} className="rounded-xl border border-border bg-card p-6">
              <h2 className="mb-3 text-xl font-extrabold text-primary">{s.h}</h2>
              <p className="text-sm text-muted-foreground">{s.p}</p>
            </div>
          ))}
        </article>
      </section>
    </PageShell>
  ),
});

const sections = [
  { h: "1. قبول الشروط", p: "باستخدامك لمنصة سرعات فإنك توافق على الالتزام بهذه الشروط وأي تعديلات مستقبلية." },
  { h: "2. حسابات المستخدمين", p: "أنت مسؤول عن سرية بيانات حسابك وجميع الأنشطة التي تتم من خلاله. يجب أن تكون المعلومات المقدمة صحيحة ومحدّثة." },
  { h: "3. الخدمات والمشاريع", p: "يلتزم البائعون بتقديم خدمات ذات جودة عالية وفق الوصف المذكور. يلتزم المشترون بدفع القيمة المتفق عليها في الوقت المحدد." },
  { h: "4. العمولة والمدفوعات", p: "تحتفظ سرعات بنسبة 20% من قيمة كل طلب مكتمل كعمولة تشغيل المنصة." },
  { h: "5. المحتوى المحظور", p: "يُمنع نشر أي محتوى مخالف للقوانين أو يحرّض على العنف أو التمييز أو ينتهك حقوق الملكية الفكرية." },
  { h: "6. حل النزاعات", p: "في حال نشوب نزاع بين البائع والمشتري، يتم تصعيده لفريق الدعم لاتخاذ قرار عادل خلال 5 أيام عمل." },
  { h: "7. إنهاء الحساب", p: "تحتفظ سرعات بالحق في تعليق أو إنهاء أي حساب يخالف هذه الشروط دون إشعار مسبق." },
];