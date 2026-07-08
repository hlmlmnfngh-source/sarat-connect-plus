import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Sparkles, Mail, Lock, User as UserIcon, ShoppingBag, Briefcase } from "lucide-react";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { lovable } from "@/integrations/lovable/index";
import { useAuth } from "@/hooks/use-auth";

export const Route = createFileRoute("/auth")({
  head: () => ({ meta: [{ title: "تسجيل الدخول — سرعات" }] }),
  component: AuthPage,
});

function AuthPage() {
  const [mode, setMode] = useState<"login" | "signup">("login");
  const [step, setStep] = useState<"auth" | "choose-role">("auth");
  const [role, setRole] = useState<"buyer" | "seller" | null>(null);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [fullName, setFullName] = useState("");
  const [busy, setBusy] = useState(false);
  const navigate = useNavigate();
  const { user } = useAuth();

  useEffect(() => {
    if (user && step === "auth" && mode === "login") navigate({ to: "/" });
  }, [user, navigate, step, mode]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    try {
      if (mode === "signup") {
        const { error } = await supabase.auth.signUp({
          email,
          password,
          options: {
            emailRedirectTo: window.location.origin,
            data: { full_name: fullName },
          },
        });
        if (error) throw error;
        // بعد التسجيل، اعرض خطوة اختيار الدور
        setStep("choose-role");
        toast.success("تم إنشاء الحساب! اختر نوع حسابك.");
      } else {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
        toast.success("مرحباً بك في سرعات!");
        navigate({ to: "/" });
      }
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "حدث خطأ ما");
    } finally {
      setBusy(false);
    }
  };

  const handleGoogle = async () => {
    setBusy(true);
    const result = await lovable.auth.signInWithOAuth("google", { redirect_uri: window.location.origin });
    if (result.error) {
      toast.error("فشل تسجيل الدخول بجوجل");
      setBusy(false);
      return;
    }
    if (!result.redirected) {
      toast.success("مرحباً بك!");
      setStep("choose-role");
    }
  };

  const handleRoleSelect = async (selectedRole: "buyer" | "seller") => {
    setRole(selectedRole);
    setBusy(true);
    try {
      // حفظ الدور في قاعدة البيانات
      const { data: { user: currentUser } } = await supabase.auth.getUser();
      if (currentUser) {
        await supabase
          .from("profiles")
          .update({ account_type: selectedRole })
          .eq("id", currentUser.id);
      }
      toast.success(selectedRole === "seller" ? "مرحباً بك كبائع!" : "مرحباً بك كمشتري!");
      if (selectedRole === "seller") {
        navigate({ to: "/create-service" });
      } else {
        navigate({ to: "/" });
      }
    } catch (err) {
      toast.error("حدث خطأ في حفظ البيانات");
    } finally {
      setBusy(false);
    }
  };

  // خطوة اختيار الدور
  if (step === "choose-role") {
    return (
      <div className="min-h-screen bg-gradient-hero flex items-center justify-center px-4">
        <div className="w-full max-w-lg">
          <div className="rounded-3xl bg-card p-8 shadow-elevated text-center">
            <div className="mb-2 flex justify-center">
              <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-accent shadow-glow">
                <Sparkles className="h-7 w-7 text-accent-foreground" />
              </div>
            </div>
            <h2 className="mb-2 text-2xl font-extrabold text-primary">كيف ستستخدم سرعات؟</h2>
            <p className="mb-8 text-muted-foreground">اختر نوع حسابك للبدء</p>

            <div className="grid grid-cols-2 gap-4">
              {/* مشتري */}
              <button
                onClick={() => handleRoleSelect("buyer")}
                disabled={busy}
                className="group flex flex-col items-center gap-4 rounded-2xl border-2 border-border bg-background p-6 transition-all hover:border-accent hover:shadow-elevated"
              >
                <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-blue-500/10 transition-transform group-hover:scale-110">
                  <ShoppingBag className="h-8 w-8 text-blue-500" />
                </div>
                <div>
                  <div className="text-lg font-extrabold text-primary">مشتري 🛒</div>
                  <div className="mt-1 text-xs text-muted-foreground">أبحث عن خدمات وأنشر مشاريع</div>
                </div>
              </button>

              {/* بائع */}
              <button
                onClick={() => handleRoleSelect("seller")}
                disabled={busy}
                className="group flex flex-col items-center gap-4 rounded-2xl border-2 border-border bg-background p-6 transition-all hover:border-accent hover:shadow-elevated"
              >
                <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-orange-500/10 transition-transform group-hover:scale-110">
                  <Briefcase className="h-8 w-8 text-orange-500" />
                </div>
                <div>
                  <div className="text-lg font-extrabold text-primary">بائع 💼</div>
                  <div className="mt-1 text-xs text-muted-foreground">أقدم خدمات وأكسب المال</div>
                </div>
              </button>
            </div>

            <p className="mt-6 text-xs text-muted-foreground">
              يمكنك تغيير نوع حسابك لاحقاً من الإعدادات
            </p>
          </div>
        </div>
      </div>
    );
  }

  // خطوة تسجيل الدخول/إنشاء الحساب
  return (
    <div className="min-h-screen bg-gradient-hero">
      <div className="container mx-auto flex min-h-screen items-center justify-center px-4 py-10">
        <div className="grid w-full max-w-5xl gap-8 lg:grid-cols-2">
          <div className="hidden text-primary-foreground lg:flex lg:flex-col lg:justify-center">
            <div className="mb-6 flex items-center gap-2">
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-accent shadow-glow">
                <Sparkles className="h-6 w-6 text-accent-foreground" />
              </div>
              <span className="text-3xl font-extrabold">سرعات</span>
            </div>
            <h1 className="mb-4 text-4xl font-extrabold leading-tight">
              انضم لأكبر منصة عربية<br />للعمل الحر
            </h1>
            <p className="text-lg text-white/70">
              أكثر من 12,000 مستقل و95,000 مشروع مكتمل. ابدأ رحلتك معنا اليوم.
            </p>
          </div>

          <div className="rounded-3xl bg-card p-8 shadow-elevated md:p-10">
            <div className="mb-6 flex gap-2 rounded-xl bg-muted p-1.5">
              {(["login", "signup"] as const).map((m) => (
                <button
                  key={m}
                  type="button"
                  onClick={() => setMode(m)}
                  className={`flex-1 rounded-lg py-2.5 text-sm font-bold transition ${
                    mode === m ? "bg-primary text-primary-foreground shadow-soft" : "text-muted-foreground"
                  }`}
                >
                  {m === "login" ? "تسجيل الدخول" : "إنشاء حساب"}
                </button>
              ))}
            </div>

            <Button onClick={handleGoogle} disabled={busy} variant="outline" size="lg" className="mb-4 w-full">
              <svg className="h-5 w-5" viewBox="0 0 24 24">
                <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
              </svg>
              متابعة باستخدام جوجل
            </Button>

            <div className="my-5 flex items-center gap-3 text-xs text-muted-foreground">
              <div className="h-px flex-1 bg-border" /> أو <div className="h-px flex-1 bg-border" />
            </div>

            <form onSubmit={handleSubmit} className="space-y-3">
              {mode === "signup" && (
                <div className="relative">
                  <UserIcon className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                  <input
                    required
                    type="text"
                    placeholder="الاسم الكامل"
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    className="h-12 w-full rounded-lg border border-input bg-background pr-10 pl-3 text-sm outline-none focus:border-accent focus:ring-2 focus:ring-accent/20"
                  />
                </div>
              )}
              <div className="relative">
                <Mail className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <input
                  required
                  type="email"
                  placeholder="البريد الإلكتروني"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="h-12 w-full rounded-lg border border-input bg-background pr-10 pl-3 text-sm outline-none focus:border-accent focus:ring-2 focus:ring-accent/20"
                />
              </div>
              <div className="relative">
                <Lock className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <input
                  required
                  minLength={6}
                  type="password"
                  placeholder="كلمة المرور"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="h-12 w-full rounded-lg border border-input bg-background pr-10 pl-3 text-sm outline-none focus:border-accent focus:ring-2 focus:ring-accent/20"
                />
              </div>
              <Button type="submit" disabled={busy} variant="hero" size="lg" className="w-full">
                {busy ? "..." : mode === "login" ? "تسجيل الدخول" : "إنشاء الحساب"}
              </Button>
            </form>

            <p className="mt-5 text-center text-xs text-muted-foreground">
              بإنشاء حساب فأنت توافق على شروط الاستخدام وسياسة الخصوصية
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}


