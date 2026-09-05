import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { User as UserIcon, Mail, Lock, Bell } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { PageShell, PageHero } from "@/components/site/PageShell";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";

export const Route = createFileRoute("/settings")({
  head: () => ({
    meta: [
      { title: "إعدادات الحساب — سرعات" },
      { name: "description", content: "عدّل بياناتك الشخصية، صورتك، بريدك الإلكتروني، كلمة المرور وتفضيلات الإشعارات." },
      { property: "og:title", content: "إعدادات الحساب — سرعات" },
      { property: "og:description", content: "إدارة بيانات حسابك وتفضيلات الإشعارات على منصة سرعات." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: SettingsPage,
});

const NOTIF_KEY = "sarat:notification-prefs";

function SettingsPage() {
  const { user, loading } = useAuth();
  const navigate = useNavigate();
  const [fullName, setFullName] = useState("");
  const [username, setUsername] = useState("");
  const [bio, setBio] = useState("");
  const [avatarUrl, setAvatarUrl] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [prefs, setPrefs] = useState({ messages: true, orders: true, marketing: false });

  useEffect(() => {
    if (!loading && !user) navigate({ to: "/auth" });
  }, [loading, user, navigate]);

  useEffect(() => {
    const raw = typeof window !== "undefined" ? window.localStorage.getItem(NOTIF_KEY) : null;
    if (raw) {
      try {
        setPrefs((p) => ({ ...p, ...JSON.parse(raw) }));
      } catch {
        /* ignore malformed prefs */
      }
    }
  }, []);

  useEffect(() => {
    if (!user) return;
    setEmail(user.email ?? "");
    supabase
      .from("profiles")
      .select("full_name, username, bio, avatar_url, verification_status, identity_document_path")
      .eq("id", user.id)
      .maybeSingle()
      .then(({ data }) => {
        if (!data) return;
        setFullName(data.full_name ?? "");
        setUsername(data.username ?? "");
        setBio(data.bio ?? "");
        setAvatarUrl(data.avatar_url ?? "");
        setVerStatus(data.verification_status ?? "pending");
        setDocLoaded(data.identity_document_path ?? null);
      });
  }, [user]);


  const saveProfile = async () => {
    if (!user) return;
    setBusy(true);
    const { error } = await supabase
      .from("profiles")
      .update({ full_name: fullName, username, bio, avatar_url: avatarUrl || null })
      .eq("id", user.id);
    setBusy(false);
    if (error) toast.error(error.message);
    else toast.success("تم حفظ الملف الشخصي");
  };

  const saveEmail = async () => {
    setBusy(true);
    const { error } = await supabase.auth.updateUser({ email });
    setBusy(false);
    if (error) toast.error(error.message);
    else toast.success("تم إرسال رسالة تأكيد إلى بريدك الجديد");
  };

  const savePassword = async () => {
    if (password.length < 6) return toast.error("كلمة المرور يجب ألا تقل عن ٦ أحرف");
    setBusy(true);
    const { error } = await supabase.auth.updateUser({ password });
    setBusy(false);
    if (error) toast.error(error.message);
    else {
      setPassword("");
      toast.success("تم تغيير كلمة المرور");
    }
  };

  const updatePref = (key: keyof typeof prefs, value: boolean) => {
    const next = { ...prefs, [key]: value };
    setPrefs(next);
    window.localStorage.setItem(NOTIF_KEY, JSON.stringify(next));
    toast.success("تم تحديث تفضيلات الإشعارات");
  };

  return (
    <PageShell>
      <PageHero title="إعدادات الحساب" subtitle="أدر بياناتك الشخصية وتفضيلاتك" />
      <div className="container mx-auto max-w-3xl space-y-6 px-4 py-12 lg:px-6">
        <Card className="p-6">
          <h2 className="mb-4 flex items-center gap-2 text-lg font-bold"><UserIcon className="h-5 w-5 text-accent" /> الملف الشخصي</h2>
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="fullName">الاسم الكامل</Label>
              <Input id="fullName" value={fullName} onChange={(e) => setFullName(e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="username">اسم المستخدم</Label>
              <Input id="username" value={username} onChange={(e) => setUsername(e.target.value)} />
            </div>
            <div className="space-y-2 sm:col-span-2">
              <Label htmlFor="avatar">رابط الصورة الشخصية</Label>
              <Input id="avatar" dir="ltr" value={avatarUrl} onChange={(e) => setAvatarUrl(e.target.value)} placeholder="https://..." />
            </div>
            <div className="space-y-2 sm:col-span-2">
              <Label htmlFor="bio">نبذة عنك</Label>
              <Textarea id="bio" rows={4} value={bio} onChange={(e) => setBio(e.target.value)} />
            </div>
          </div>
          <Button className="mt-4" onClick={saveProfile} disabled={busy}>حفظ التغييرات</Button>
        </Card>

        <Card className="p-6">
          <h2 className="mb-4 flex items-center gap-2 text-lg font-bold"><Mail className="h-5 w-5 text-accent" /> البريد الإلكتروني</h2>
          <div className="flex flex-col gap-3 sm:flex-row">
            <Input dir="ltr" type="email" value={email} onChange={(e) => setEmail(e.target.value)} />
            <Button variant="outline" onClick={saveEmail} disabled={busy}>تحديث البريد</Button>
          </div>
        </Card>

        <Card className="p-6">
          <h2 className="mb-4 flex items-center gap-2 text-lg font-bold"><Lock className="h-5 w-5 text-accent" /> كلمة المرور</h2>
          <div className="flex flex-col gap-3 sm:flex-row">
            <Input dir="ltr" type="password" value={password} placeholder="كلمة مرور جديدة" onChange={(e) => setPassword(e.target.value)} />
            <Button variant="outline" onClick={savePassword} disabled={busy}>تغيير كلمة المرور</Button>
          </div>
        </Card>

        <Card className="p-6">
          <h2 className="mb-4 flex items-center gap-2 text-lg font-bold"><Bell className="h-5 w-5 text-accent" /> تفضيلات الإشعارات</h2>
          <div className="space-y-4">
            {[
              { key: "messages" as const, label: "إشعارات الرسائل الجديدة" },
              { key: "orders" as const, label: "إشعارات الطلبات والمدفوعات" },
              { key: "marketing" as const, label: "رسائل العروض والتحديثات" },
            ].map((row) => (
              <div key={row.key} className="flex items-center justify-between">
                <Label htmlFor={row.key}>{row.label}</Label>
                <Switch id={row.key} checked={prefs[row.key]} onCheckedChange={(v) => updatePref(row.key, v)} />
              </div>
            ))}
          </div>
        </Card>
      </div>
    </PageShell>
  );
}