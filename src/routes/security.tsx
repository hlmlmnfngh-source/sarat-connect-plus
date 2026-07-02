import { createFileRoute } from "@tanstack/react-router";
import { Shield, Lock, Eye, Server } from "lucide-react";
import { PageShell, PageHero } from "@/components/site/PageShell";

export const Route = createFileRoute("/security")({
  head: () => ({ meta: [{ title: "الأمان — سرعات" }, { name: "description", content: "الممارسات الأمنية على منصة سرعات." }] }),
  component: () => (
    <PageShell>
      <PageHero title="الأمان في سرعات" subtitle="نحمي بياناتك ومدفوعاتك بأحدث معايير الأمان" />
      <section className="container mx-auto max-w-4xl px-4 py-14 lg:px-6">
        <div className="grid gap-5 md:grid-cols-2">
          {features.map((f) => (
            <div key={f.t} className="rounded-2xl border border-border bg-card p-6">
              <div className="mb-3 flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-accent text-accent-foreground">
                <f.I className="h-6 w-6" />
              </div>
              <h3 className="mb-2 text-lg font-extrabold text-primary">{f.t}</h3>
              <p className="text-sm leading-relaxed text-muted-foreground">{f.d}</p>
            </div>
          ))}
        </div>
      </section>
    </PageShell>
  ),
});

const features = [
  { I: Shield, t: "تشفير كامل TLS 1.3", d: "جميع البيانات مشفّرة أثناء النقل بين متصفحك وخوادمنا." },
  { I: Lock, t: "حماية المدفوعات", d: "نستخدم Stripe المتوافق مع PCI DSS Level 1 لمعالجة كل معاملة." },
  { I: Eye, t: "سياسات RLS", d: "كل مستخدم يرى بياناته فقط عبر سياسات صارمة على مستوى قاعدة البيانات." },
  { I: Server, t: "نسخ احتياطية يومية", d: "نسخ احتياطية تلقائية مع إمكانية الاستعادة عند الطلب." },
];