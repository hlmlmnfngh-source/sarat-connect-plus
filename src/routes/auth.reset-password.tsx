import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Lock, Sparkles } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export const Route = createFileRoute("/auth/reset-password")({
  head: () => ({
    meta: [
      { title: "تعيين كلمة مرور جديدة — سرعات" },
      { name: "description", content: "اختر كلمة مرور جديدة لحسابك على منصة سرعات وأكمل عملية الاستعادة." },
      { property: "og:title", content: "تعيين كلمة مرور جديدة — سرعات" },
      { property: "og:description", content: "أكمل استعادة حسابك بتعيين كلمة مرور جديدة." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: ResetPasswordPage,
});

function ResetPasswordPage() {
  const navigate = useNavigate();
  const [ready, setReady] = useState(false);
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    const hash = window.location.hash;
    const isRecovery = hash.includes("type=recovery");
    const { data: sub } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === "PASSWORD_RECOVERY" || session) setReady(true);
    });
    supabase.auth.getSession().then(({ data }) => {
      if (data.session || isRecovery) setReady(true);
      else {
        toast.error("رابط إعادة التعيين غير صالح أو منتهي الصلاحية");
        navigate({ to: "/auth/forgot-password" });
      }
    });
    return () => sub.subscription.unsubscribe();
  }, [navigate]);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (password.length < 6) return toast.error("كلمة المرور يجب ألا تقل عن ٦ أحرف");
    if (password !== confirm) return toast.error("كلمتا المرور غير متطابقتين");
    setBusy(true);
    const { error } = await supabase.auth.updateUser({ password });
    setBusy(false);
    if (error) return toast.error(error.message);
    toast.success("تم تحديث كلمة المرور بنجاح");
    navigate({ to: "/" });
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-muted px-4 py-16">
      <div className="w-full max-w-md rounded-2xl border border-border bg-card p-8 shadow-soft">
        <div className="mb-6 flex flex-col items-center gap-2 text-center">
          <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-gradient-accent text-accent-foreground">
            <Sparkles className="h-5 w-5" />
          </div>
          <h1 className="text-2xl font-extrabold">كلمة مرور جديدة</h1>
          <p className="text-sm text-muted-foreground">اختر كلمة مرور قوية لحسابك</p>
        </div>
        <form onSubmit={submit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="pw">كلمة المرور الجديدة</Label>
            <div className="relative">
              <Lock className="absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input id="pw" dir="ltr" type="password" required value={password} onChange={(e) => setPassword(e.target.value)} className="pr-9" />
            </div>
          </div>
          <div className="space-y-2">
            <Label htmlFor="pw2">تأكيد كلمة المرور</Label>
            <Input id="pw2" dir="ltr" type="password" required value={confirm} onChange={(e) => setConfirm(e.target.value)} />
          </div>
          <Button type="submit" className="w-full" disabled={busy || !ready}>
            {busy ? "جارٍ الحفظ..." : "حفظ كلمة المرور"}
          </Button>
        </form>
      </div>
    </div>
  );
}