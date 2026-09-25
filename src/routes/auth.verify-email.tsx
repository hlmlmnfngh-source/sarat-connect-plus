import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect } from "react";
import { Mail, ShieldCheck } from "lucide-react";
import { useAuth } from "@/hooks/use-auth";
import { useEmailVerification, EmailVerificationField } from "@/components/site/VerificationStep";
import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/auth/verify-email")({
  head: () => ({ meta: [{ title: "تأكيد البريد الإلكتروني — سرعات" }] }),
  component: VerifyEmailPage,
});

function VerifyEmailPage() {
  const { user, loading } = useAuth();
  const navigate = useNavigate();
  const verification = useEmailVerification(user?.id, user?.email);

  useEffect(() => {
    if (!loading && !user) navigate({ to: "/auth" });
  }, [loading, user, navigate]);

  if (!user) return null;

  return (
    <main dir="rtl" className="flex min-h-screen items-center justify-center bg-gradient-hero px-4 py-12">
      <section className="w-full max-w-lg rounded-3xl bg-card p-8 shadow-elevated">
        <div className="mb-6 flex justify-center">
          <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-accent text-accent-foreground shadow-glow">
            <Mail className="h-7 w-7" />
          </div>
        </div>
        <h1 className="text-center text-2xl font-extrabold text-primary">تأكيد البريد الإلكتروني</h1>
        <p className="mt-2 text-center text-sm text-muted-foreground">
          أرسلنا رمزًا من 6 أرقام إلى بريدك. أدخله هنا لتفعيل بريد الحساب.
        </p>
        <div className="mt-8">
          <EmailVerificationField v={verification} email={user.email} />
        </div>
        {verification.emailVerified && (
          <div className="mt-5 rounded-xl border border-green-500/30 bg-green-500/10 p-4 text-sm text-green-700">
            <div className="flex items-center gap-2 font-bold"><ShieldCheck className="h-4 w-4" /> البريد موثّق</div>
            <p className="mt-1">يمكنك الآن الانتقال لإكمال توثيق الهوية أو العودة لحسابك.</p>
          </div>
        )}
        <div className="mt-6 grid gap-2 sm:grid-cols-2">
          <Button variant="hero" disabled={!verification.emailVerified} onClick={() => navigate({ to: "/verification" })}>
            متابعة التحقق من الهوية
          </Button>
          <Button variant="outline" asChild><Link to="/settings">إعدادات الحساب</Link></Button>
        </div>
      </section>
    </main>
  );
}
