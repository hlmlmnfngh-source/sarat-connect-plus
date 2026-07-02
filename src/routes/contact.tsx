import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { Mail, MessageCircle, MapPin } from "lucide-react";
import { z } from "zod";
import { toast } from "sonner";
import { PageShell, PageHero } from "@/components/site/PageShell";
import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/contact")({
  head: () => ({ meta: [{ title: "تواصل معنا — سرعات" }, { name: "description", content: "تواصل مع فريق دعم منصة سرعات." }] }),
  component: ContactPage,
});

const schema = z.object({
  name: z.string().trim().min(2, "الاسم قصير جداً").max(100),
  email: z.string().trim().email("بريد غير صالح").max(255),
  message: z.string().trim().min(10, "الرسالة قصيرة جداً").max(1000),
});

function ContactPage() {
  const [form, setForm] = useState({ name: "", email: "", message: "" });
  const [submitting, setSubmitting] = useState(false);

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    const parsed = schema.safeParse(form);
    if (!parsed.success) {
      toast.error(parsed.error.issues[0].message);
      return;
    }
    setSubmitting(true);
    setTimeout(() => {
      toast.success("تم إرسال رسالتك، سنتواصل معك قريباً");
      setForm({ name: "", email: "", message: "" });
      setSubmitting(false);
    }, 600);
  };

  return (
    <PageShell>
      <PageHero title="تواصل معنا" subtitle="نحن هنا للإجابة على أسئلتك" />
      <section className="container mx-auto grid max-w-5xl gap-8 px-4 py-14 md:grid-cols-2 lg:px-6">
        <div className="space-y-6">
          {[
            { I: Mail, t: "البريد الإلكتروني", v: "support@sarat.app" },
            { I: MessageCircle, t: "الدعم المباشر", v: "متاح 24/7 عبر المحادثة" },
            { I: MapPin, t: "المقر", v: "دبي، الإمارات العربية المتحدة" },
          ].map((c) => (
            <div key={c.t} className="flex items-start gap-4 rounded-xl border border-border bg-card p-5">
              <div className="flex h-11 w-11 items-center justify-center rounded-lg bg-gradient-accent text-accent-foreground">
                <c.I className="h-5 w-5" />
              </div>
              <div>
                <div className="font-bold text-primary">{c.t}</div>
                <div className="text-sm text-muted-foreground">{c.v}</div>
              </div>
            </div>
          ))}
        </div>
        <form onSubmit={submit} className="space-y-4 rounded-2xl border border-border bg-card p-6 shadow-soft">
          <div>
            <label className="mb-1.5 block text-sm font-bold">الاسم</label>
            <input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} className="h-11 w-full rounded-lg border border-input bg-background px-3 outline-none focus:border-accent" />
          </div>
          <div>
            <label className="mb-1.5 block text-sm font-bold">البريد الإلكتروني</label>
            <input type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} className="h-11 w-full rounded-lg border border-input bg-background px-3 outline-none focus:border-accent" />
          </div>
          <div>
            <label className="mb-1.5 block text-sm font-bold">الرسالة</label>
            <textarea rows={5} value={form.message} onChange={(e) => setForm({ ...form, message: e.target.value })} className="w-full rounded-lg border border-input bg-background p-3 outline-none focus:border-accent" />
          </div>
          <Button type="submit" variant="hero" size="xl" className="w-full" disabled={submitting}>
            {submitting ? "جارٍ الإرسال..." : "إرسال الرسالة"}
          </Button>
        </form>
      </section>
    </PageShell>
  );
}