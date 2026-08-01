import { useEffect, useState } from "react";
import { useNavigate } from "@tanstack/react-router";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";

type Props = { serviceId?: string };

export function ServiceForm({ serviceId }: Props) {
  const { user, loading } = useAuth();
  const navigate = useNavigate();
  const [cats, setCats] = useState<{ id: string; name_ar: string }[]>([]);
  const [busy, setBusy] = useState(false);
  const [form, setForm] = useState({
    title: "",
    description: "",
    category_id: "",
    price: 5,
    delivery_days: 3,
    revisions: 1,
    tags: "",
    features: "",
    is_quick: false,
    status: "active" as "active" | "draft" | "paused",
  });

  useEffect(() => {
    if (!loading && !user) navigate({ to: "/auth" });
  }, [loading, user, navigate]);

  useEffect(() => {
    supabase
      .from("categories")
      .select("id, name_ar")
      .order("sort_order")
      .then(({ data }) => setCats(data ?? []));
  }, []);

  useEffect(() => {
    if (!serviceId) return;
    supabase
      .from("services")
      .select("title, description, category_id, price, delivery_days, revisions, tags, features, is_quick, status")
      .eq("id", serviceId)
      .maybeSingle()
      .then(({ data }) => {
        if (!data) return;
        setForm({
          title: data.title ?? "",
          description: data.description ?? "",
          category_id: data.category_id ?? "",
          price: Number(data.price ?? 5),
          delivery_days: data.delivery_days ?? 3,
          revisions: data.revisions ?? 1,
          tags: (data.tags ?? []).join("، "),
          features: (data.features ?? []).join("\n"),
          is_quick: !!data.is_quick,
          status: (data.status as "active" | "draft" | "paused") ?? "active",
        });
      });
  }, [serviceId]);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    if (form.title.trim().length < 10) return toast.error("العنوان يجب ألا يقل عن ١٠ أحرف");
    if (form.description.trim().length < 30) return toast.error("الوصف يجب ألا يقل عن ٣٠ حرفًا");
    setBusy(true);
    const payload = {
      title: form.title.trim(),
      description: form.description.trim(),
      category_id: form.category_id || null,
      price: form.price,
      delivery_days: form.delivery_days,
      revisions: form.revisions,
      tags: form.tags.split(/[،,]/).map((t) => t.trim()).filter(Boolean),
      features: form.features.split("\n").map((t) => t.trim()).filter(Boolean),
      is_quick: form.is_quick,
      status: form.status,
    };
    const { error } = serviceId
      ? await supabase.from("services").update(payload).eq("id", serviceId)
      : await supabase.from("services").insert({ ...payload, seller_id: user.id });
    setBusy(false);
    if (error) return toast.error(error.message);
    toast.success(serviceId ? "تم تحديث الخدمة" : "تم نشر الخدمة بنجاح");
    navigate({ to: "/dashboard/seller" });
  };

  const commission = (form.price * 0.2).toFixed(2);
  const net = (form.price * 0.8).toFixed(2);

  return (
    <form onSubmit={submit} className="container mx-auto max-w-3xl space-y-6 px-4 py-12 lg:px-6">
      <Card className="space-y-4 p-6">
        <div className="space-y-2">
          <Label htmlFor="title">عنوان الخدمة</Label>
          <Input id="title" value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} placeholder="سأصمم هوية بصرية احترافية لعلامتك التجارية" />
        </div>
        <div className="space-y-2">
          <Label htmlFor="cat">الفئة</Label>
          <select
            id="cat"
            value={form.category_id}
            onChange={(e) => setForm({ ...form, category_id: e.target.value })}
            className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
          >
            <option value="">اختر الفئة</option>
            {cats.map((c) => (
              <option key={c.id} value={c.id}>{c.name_ar}</option>
            ))}
          </select>
        </div>
        <div className="space-y-2">
          <Label htmlFor="desc">وصف الخدمة</Label>
          <Textarea id="desc" rows={7} value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} />
        </div>
      </Card>

      <Card className="grid gap-4 p-6 sm:grid-cols-3">
        <div className="space-y-2">
          <Label htmlFor="price">السعر (USD)</Label>
          <Input id="price" type="number" min={5} value={form.price} onChange={(e) => setForm({ ...form, price: Number(e.target.value) })} />
        </div>
        <div className="space-y-2">
          <Label htmlFor="days">مدة التسليم (أيام)</Label>
          <Input id="days" type="number" min={1} value={form.delivery_days} onChange={(e) => setForm({ ...form, delivery_days: Number(e.target.value) })} />
        </div>
        <div className="space-y-2">
          <Label htmlFor="rev">عدد التعديلات</Label>
          <Input id="rev" type="number" min={0} value={form.revisions} onChange={(e) => setForm({ ...form, revisions: Number(e.target.value) })} />
        </div>
        <p className="text-sm text-muted-foreground sm:col-span-3">
          عمولة المنصة ٢٠٪: <strong>${commission}</strong> — صافي أرباحك: <strong>${net}</strong>
        </p>
      </Card>

      <Card className="space-y-4 p-6">
        <div className="space-y-2">
          <Label htmlFor="features">مميزات الخدمة (سطر لكل ميزة)</Label>
          <Textarea id="features" rows={4} value={form.features} onChange={(e) => setForm({ ...form, features: e.target.value })} />
        </div>
        <div className="space-y-2">
          <Label htmlFor="tags">الكلمات المفتاحية (افصل بفاصلة)</Label>
          <Input id="tags" value={form.tags} onChange={(e) => setForm({ ...form, tags: e.target.value })} placeholder="تصميم، شعار، هوية" />
        </div>
        <div className="flex items-center justify-between">
          <Label htmlFor="quick">خدمة سريعة (تسليم خلال ٢٤ ساعة)</Label>
          <Switch id="quick" checked={form.is_quick} onCheckedChange={(v) => setForm({ ...form, is_quick: v })} />
        </div>
        <div className="space-y-2">
          <Label htmlFor="status">حالة الخدمة</Label>
          <select
            id="status"
            value={form.status}
            onChange={(e) => setForm({ ...form, status: e.target.value as "active" | "draft" | "paused" })}
            className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
          >
            <option value="active">منشورة</option>
            <option value="draft">مسودة</option>
            <option value="paused">متوقفة</option>
          </select>
        </div>
      </Card>

      <div className="flex gap-3">
        <Button type="submit" variant="hero" size="lg" disabled={busy}>
          {busy ? "جارٍ الحفظ..." : serviceId ? "حفظ التعديلات" : "نشر الخدمة"}
        </Button>
        <Button type="button" variant="outline" size="lg" onClick={() => navigate({ to: "/dashboard/seller" })}>
          إلغاء
        </Button>
      </div>
    </form>
  );
}