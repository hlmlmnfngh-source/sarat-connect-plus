import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { ShieldCheck } from "lucide-react";
import { useAuth } from "@/hooks/use-auth";
import { supabase } from "@/integrations/supabase/client";
import { useEmailVerification, EmailVerificationField, useIdDocumentUpload, IdDocumentField, VerificationStatusBadge } from "@/components/site/VerificationStep";
import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/verification")({
  head: () => ({ meta: [{ title: "التحقق من الحساب والهوية — سرعات" }] }),
  component: VerificationPage,
});

function VerificationPage() {
  const { user, loading } = useAuth();
  const navigate = useNavigate();
  const [profile, setProfile] = useState<{ verification_status: string; identity_document_path: string | null } | null>(null);
  const email = useEmailVerification(user?.id, user?.email);
  const id = useIdDocumentUpload(user?.id, profile?.identity_document_path);

  useEffect(() => {
    if (!loading && !user) navigate({ to: "/auth" });
  }, [loading, user, navigate]);

  useEffect(() => {
    if (!user) return;
    supabase.from("profiles").select("verification_status,identity_document_path").eq("id", user.id).maybeSingle()
      .then(({ data }) => data && setProfile(data));
  }, [user, id.docPath]);

  if (!user) return null;
  const status = profile?.verification_status ?? "pending";
  const complete = email.emailVerified && !!id.docPath;

  return (
    <main dir="rtl" className="min-h-screen bg-muted px-4 py-12">
      <section className="mx-auto max-w-2xl rounded-3xl bg-card p-8 shadow-elevated">
        <div className="mb-5 flex justify-center"><div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-accent text-accent-foreground shadow-glow"><ShieldCheck className="h-7 w-7" /></div></div>
        <h1 className="text-center text-2xl font-extrabold text-primary">التحقق من الحساب والهوية</h1>
        <p className="mx-auto mt-2 max-w-xl text-center text-sm leading-6 text-muted-foreground">
          هذا هو مسار التوثيق الأساسي في سرعات: تأكيد ملكية البريد، ثم رفع وثيقة هوية للمراجعة، ثم انتظار اعتماد فريق المنصة.
        </p>
        <div className="mt-6 flex items-center justify-between rounded-xl border border-border bg-muted/50 p-4">
          <div><div className="font-bold">حالة الهوية</div><div className="text-xs text-muted-foreground">المراجعة البشرية قد تستغرق وقتًا قبل اعتماد الحساب.</div></div>
          <VerificationStatusBadge status={status} />
        </div>
        <div className="mt-6 space-y-6">
          <EmailVerificationField v={email} email={user.email} />
          <IdDocumentField u={id} />
        </div>
        {status === "rejected" && (
          <div className="mt-4 rounded-xl border border-destructive/30 bg-destructive/5 p-4 text-sm text-destructive">
            تم رفض الوثيقة السابقة. ارفع وثيقة واضحة وسارية لإعادة إرسال الطلب للمراجعة.
          </div>
        )}
        {status === "approved" && (
          <div className="mt-4 rounded-xl border border-green-500/30 bg-green-500/10 p-4 text-sm text-green-700">
            تم اعتماد الهوية. لا تحتاج إلى رفع الوثيقة مرة أخرى.
          </div>
        )}
        <div className="mt-6 flex flex-col gap-2 sm:flex-row">
          <Button variant="hero" className="flex-1" disabled={!complete} onClick={() => navigate({ to: "/seller/onboarding" })}>
            متابعة إعداد البائع
          </Button>
          <Button variant="outline" className="flex-1" onClick={() => navigate({ to: "/settings" })}>إعدادات الحساب</Button>
        </div>
      </section>
    </main>
  );
}
