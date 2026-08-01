import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { toast } from "sonner";
import { Mail, Sparkles, ArrowRight } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export const Route = createFileRoute("/auth/forgot-password")({
  head: () => ({
    meta: [
      { title: "استعادة كلمة المرور — سرعات" },
      { name: "description", content: "أدخل بريدك الإلكتروني لإرسال رابط إعادة تعيين كلمة المرور لحسابك في سرعات." },
      { property: "og:title", content: "استعادة كلمة المرور — سرعات" },
      { property: "og:description", content: "أرسل رابط إعادة تعيين كلمة المرور إلى بريدك الإلكتروني." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: ForgotPasswordPage,
});

function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [busy, setBusy] = useState(false);
  const [sent, setSent] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/auth/reset-password`,
    });
    setBusy(false);
    if (error) toast.error(error.message);
    else {
      setSent(true);
      toast.success("تم إرسال رابط إعادة التعيين");
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-muted px-4 py-16">
      <div className="w-full max-w-md rounded-2xl border border-border bg-card p-8 shadow-soft">
        <div className="mb-6 flex flex-col items-center gap-2 text-center">
          <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-gradient-accent text-accent-foreground">
            <Sparkles className="h-5 w-5" />
          </div>
          <h1 className="text-2xl font-extrabold">نسيت كلمة المرور؟</h1>
          <p className="text-sm text-muted-foreground">سنرسل لك رابطًا لإعادة تعيين كلمة المرور</p>
        </div>

        {sent ? (
          <div className="space-y-4 text-center">
            <p className="text-sm text-foreground/80">
              تحقّق من بريدك <strong dir="ltr">{email}</strong> واضغط على الرابط لإتمام إعادة التعيين.
            </p>
            <Button asChild variant="outline" className="w-full">
              <Link to="/auth">العودة لتسجيل الدخول</Link>
            </Button>
          </div>
        ) : (
          <form onSubmit={submit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="email">البريد الإلكتروني</Label>
              <div className="relative">
                <Mail className="absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input id="email" dir="ltr" type="email" required value={email} onChange={(e) => setEmail(e.target.value)} className="pr-9" />
              </div>
            </div>
            <Button type="submit" className="w-full" disabled={busy}>
              {busy ? "جارٍ الإرسال..." : "إرسال رابط الاستعادة"}
            </Button>
            <Link to="/auth" className="flex items-center justify-center gap-1 text-sm text-accent">
              <ArrowRight className="h-4 w-4" /> العودة لتسجيل الدخول
            </Link>
          </form>
        )}
      </div>
    </div>
  );
}