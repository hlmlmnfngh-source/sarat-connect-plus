import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { CheckCircle2, Circle, Briefcase, ShieldCheck, WalletCards, UserRound } from "lucide-react";
import { useAuth } from "@/hooks/use-auth";
import { supabase } from "@/integrations/supabase/client";
import { PageShell, PageHero } from "@/components/site/PageShell";
import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/seller/onboarding")({
  head: () => ({ meta: [{ title: "إعداد حساب البائع — سرعات" }] }),
  component: SellerOnboardingPage,
});

function SellerOnboardingPage() {
  const { user, loading } = useAuth();
  const navigate = useNavigate();
  const [profile, setProfile] = useState<any>(null);
  const [bio, setBio] = useState("");
  const [skillsText, setSkillsText] = useState("");
  const [years, setYears] = useState("");
  const [saving, setSaving] = useState(false);

  const load = async () => {
    if (!user) return;
    const { data } = await supabase.from("profiles").select("full_name,username,bio,skills,years_experience,account_type,email_verified,verification_status,stripe_onboarded").eq("id", user.id).maybeSingle();
    if (data) { setProfile(data); setBio(data.bio ?? ""); setSkillsText((data.skills ?? []).join(", ")); setYears(data.years_experience?.toString() ?? ""); }
  };

  useEffect(() => { if (!loading && !user) navigate({ to: "/auth" }); }, [loading, user, navigate]);
  useEffect(() => { void load(); }, [user]);

  if (!user || !profile) return <PageShell><div className="container mx-auto px-4 py-20 text-center text-muted-foreground">جارٍ تحميل إعدادات البائع...</div></PageShell>;

  const profileReady = Boolean(profile.username && profile.bio);
  const emailReady = Boolean(profile.email_verified || user.email_confirmed_at);
  const identityReady = profile.verification_status === "approved";
  const payoutReady = Boolean(profile.stripe_onboarded);

  const save = async () => {
    setSaving(true);
    const { error } = await supabase.from("profiles").update({
      account_type: "seller",
      bio: bio.trim() || null,
      skills: skillsText.split(",").map((s:string) => s.trim()).filter(Boolean).slice(0, 20),
      years_experience: years ? Math.max(0, Number(years)) : null,
    }).eq("id", user.id);
    setSaving(false);
    if (!error) await load();
  };

  const Step = ({ ok, title, text, to, action }: { ok:boolean; title:string; text:string; to?:any; action?:string }) => (
    <div className="flex items-start gap-4 rounded-2xl border border-border bg-card p-5">
      <div className="mt-0.5">{ok ? <CheckCircle2 className="h-6 w-6 text-green-600" /> : <Circle className="h-6 w-6 text-muted-foreground" />}</div>
      <div className="flex-1"><div className="font-extrabold text-primary">{title}</div><div className="mt-1 text-sm text-muted-foreground">{text}</div></div>
      {!ok && to && <Link to={to}><Button size="sm" variant="outline">{action ?? "إكمال"}</Button></Link>}
    </div>
  );

  return (
    <PageShell>
      <PageHero title="إعداد حساب البائع" subtitle="أكمل المتطلبات الأساسية قبل نشر الخدمات واستلام المدفوعات" />
      <section className="container mx-auto max-w-3xl space-y-5 px-4 py-10 lg:px-6">
        <Step ok={profileReady} title="الملف المهني" text="اسم مستخدم ونبذة واضحة عن تخصصك." />
        <Step ok={emailReady} title="تأكيد البريد" text="يجب تأكيد ملكية البريد الإلكتروني." to="/auth/verify-email" action="تأكيد البريد" />
        <Step ok={identityReady} title="توثيق الهوية" text={identityReady ? "تم اعتماد وثيقة الهوية." : "ارفع وثيقة الهوية وانتظر مراجعة فريق المنصة."} to="/verification" action="توثيق الهوية" />
        <Step ok={payoutReady} title="حساب استلام المدفوعات" text={payoutReady ? "حساب Stripe جاهز للاستلام." : "اربط حساب استلام المدفوعات قبل قبول الطلبات."} to="/wallet" action="إعداد الدفع" />

        <div className="rounded-2xl border border-border bg-card p-6">
          <div className="mb-4 flex items-center gap-2 font-extrabold text-primary"><Briefcase className="h-5 w-5 text-accent" /> البيانات المهنية</div>
          <div className="grid gap-4 sm:grid-cols-2">
            <label className="space-y-2 text-sm font-bold">النبذة<textarea value={bio} onChange={e=>setBio(e.target.value)} className="min-h-28 w-full rounded-xl border border-input bg-background p-3 font-normal" placeholder="ما الذي تقدمه للعملاء؟" /></label>
            <label className="space-y-2 text-sm font-bold">المهارات<textarea value={skillsText} onChange={e=>setSkillsText(e.target.value)} className="min-h-28 w-full rounded-xl border border-input bg-background p-3 font-normal" placeholder="Java, SQL, Android..." /></label>
            <label className="space-y-2 text-sm font-bold">سنوات الخبرة<input type="number" min="0" max="60" value={years} onChange={e=>setYears(e.target.value)} className="h-11 w-full rounded-xl border border-input bg-background px-3 font-normal" /></label>
          </div>
          <Button className="mt-4" onClick={save} disabled={saving}>{saving ? "جارٍ الحفظ..." : "حفظ البيانات"}</Button>
        </div>

        <div className="grid gap-3 sm:grid-cols-3">
          <Link to="/services/create"><Button className="w-full" variant="hero"><Briefcase className="h-4 w-4" /> إنشاء خدمة</Button></Link>
          <Link to="/profile/$userId" params={{ userId: user.id }}><Button className="w-full" variant="outline"><UserRound className="h-4 w-4" /> ملفي العام</Button></Link>
          <Link to="/wallet"><Button className="w-full" variant="outline"><WalletCards className="h-4 w-4" /> المحفظة</Button></Link>
        </div>
      </section>
    </PageShell>
  );
}
