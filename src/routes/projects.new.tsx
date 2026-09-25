import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { z } from "zod";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { PageShell, PageHero } from "@/components/site/PageShell";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/projects/new")({
  head: () => ({
    meta: [
      { title: "انشر مشروعك — سرعات" },
      { name: "description", content: "انشر مشروعك على سرعات وحدد الميزانية والمدة واستقبل عروض المستقلين العرب." },
      { property: "og:title", content: "انشر مشروعك — سرعات" },
      { property: "og:description", content: "اكتب تفاصيل مشروعك واستقبل عروض المستقلين خلال دقائق." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: NewProjectPage,
});

const schema = z
  .object({
    title: z.string().trim().min(10, "العنوان يجب ألا يقل عن ١٠ أحرف").max(120, "العنوان يجب ألا يتجاوز ١٢٠ حرفًا"),
    description: z.string().trim().min(50, "الوصف يجب ألا يقل عن ٥٠ حرفًا").max(5000, "الوصف يجب ألا يتجاوز ٥٠٠٠ حرف"),
    category_id: z.string().uuid("اختر تصنيف المشروع"),
    budget_min: z.number().finite().min(5, "الحد الأدنى للميزانية ٥ دولارات"),
    budget_max: z.number().finite().max(100000, "الحد الأعلى للميزانية ١٠٠٬٠٠٠ دولار"),
    deadline_days: z.number().int("المدة يجب أن تكون عددًا صحيحًا").min(1, "المدة يوم واحد على الأقل").max(365, "المدة لا تتجاوز ٣٦٥ يومًا"),
    skills_required: z.array(z.string().trim().min(1).max(40)).max(10, "حد أقصى ١٠ مهارات"),
  })
  .refine((d) => d.budget_max >= d.budget_min, { message: "الحد الأعلى للميزانية يجب أن يكون أكبر من أو يساوي الحد الأدنى", path: ["budget_max"] });

function NewProjectPage() {
  const { user, loading } = useAuth();
  const navigate = useNavigate();
  const [cats, setCats] = useState<{ id: string; name_ar: string }[]>([]);
  const [busy, setBusy] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [form, setForm] = useState({
    title: "",
    description: "",
    category_id: "",
    budget_min: "",
    budget_max: "",
    deadline_days: "",
    skills: "",
  });

  useEffect(() => {
    if (!loading && !user) navigate({ to: "/auth" });
  }, [loading, user, navigate]);

  useEffect(() => {
    supabase
      .from("categories")
      .select("id, name_ar")
      .is("parent_id", null)
      .order("sort_order")
      .then(({ data }) => setCats(data ?? []));
  }, []);

  const set = (k: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) =>
    setForm({ ...form, [k]: e.target.value });

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    const parsed = schema.safeParse({
      title: form.title,
      description: form.description,
      category_id: form.category_id,
      budget_min: Number(form.budget_min),
      budget_max: Number(form.budget_max),
      deadline_days: Number(form.deadline_days),
      skills_required: Array.from(new Set(form.skills.split(/[،,]/).map((s) => s.trim()).filter(Boolean))),
    });
    if (!parsed.success) {
      const errs: Record<string, string> = {};
      for (const i of parsed.error.issues) errs[String(i.path[0])] ??= i.message;
      setErrors(errs);
      toast.error("يرجى تصحيح الحقول المظللة");
      return;
    }
    setErrors({});
    setBusy(true);
    const { data, error } = await supabase
      .from("projects")
      .insert({ ...parsed.data, buyer_id: user.id, status: "open" })
      .select("id")
      .single();
    setBusy(false);
    if (error || !data) return toast.error(`تعذّر نشر المشروع: ${error?.message ?? "خطأ غير معروف"}`);
    toast.success("تم نشر مشروعك بنجاح!");
    navigate({ to: "/projects/$id", params: { id: data.id } });
  };

  const Err = ({ k }: { k: string }) => (errors[k] ? <p className="text-xs text-destructive">{errors[k]}</p> : null);

  return (
    <PageShell>
      <PageHero title="انشر مشروعك" subtitle="اكتب تفاصيل واضحة لتستقبل عروضًا أدق من المستقلين" />
      <form onSubmit={submit} noValidate className="container mx-auto max-w-3xl space-y-6 px-4 py-12 lg:px-6">
        <Card className="space-y-4 p-6">
          <div className="space-y-2">
            <Label htmlFor="title">عنوان المشروع</Label>
            <Input id="title" maxLength={120} value={form.title} onChange={set("title")} placeholder="مثال: تصميم متجر إلكتروني لبيع الملابس" />
            <Err k="title" />
          </div>
          <div className="space-y-2">
            <Label htmlFor="cat">التصنيف</Label>
            <select id="cat" value={form.category_id} onChange={set("category_id")} className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm">
              <option value="">اختر التصنيف</option>
              {cats.map((c) => <option key={c.id} value={c.id}>{c.name_ar}</option>)}
            </select>
            <Err k="category_id" />
          </div>
          <div className="space-y-2">
            <Label htmlFor="desc">وصف المشروع</Label>
            <Textarea id="desc" rows={8} maxLength={5000} value={form.description} onChange={set("description")} placeholder="اشرح المطلوب بالتفصيل، والمخرجات المتوقعة، وأي متطلبات خاصة." />
            <div className="flex justify-between"><Err k="description" /><span className="mr-auto text-xs text-muted-foreground">{form.description.trim().length} / 5000</span></div>
          </div>
        </Card>

        <Card className="grid gap-4 p-6 sm:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor="bmin">الميزانية من</Label>
            <Input id="bmin" type="number" min={5} value={form.budget_min} onChange={set("budget_min")} placeholder="50" />
            <Err k="budget_min" />
          </div>
          <div className="space-y-2">
            <Label htmlFor="bmax">الميزانية إلى</Label>
            <Input id="bmax" type="number" min={5} value={form.budget_max} onChange={set("budget_max")} placeholder="200" />
            <Err k="budget_max" />
          </div>
          <div className="space-y-2">
            <Label htmlFor="cur">العملة</Label>
            <Input id="cur" value="دولار أمريكي (USD)" readOnly disabled />
            <p className="text-xs text-muted-foreground">جميع المدفوعات على سرعات بالدولار الأمريكي.</p>
          </div>
          <div className="space-y-2">
            <Label htmlFor="days">مدة التنفيذ (أيام)</Label>
            <Input id="days" type="number" min={1} max={365} value={form.deadline_days} onChange={set("deadline_days")} placeholder="14" />
            <Err k="deadline_days" />
          </div>
        </Card>

        <Card className="space-y-2 p-6">
          <Label htmlFor="skills">المهارات المطلوبة (اختياري، افصل بفاصلة)</Label>
          <Input id="skills" value={form.skills} onChange={set("skills")} placeholder="React، تصميم واجهات، Figma" />
          <Err k="skills_required" />
        </Card>

        <div className="flex gap-3">
          <Button type="submit" variant="hero" size="lg" disabled={busy || !user}>
            {busy ? "جارٍ النشر..." : "انشر المشروع"}
          </Button>
          <Button type="button" variant="outline" size="lg" onClick={() => navigate({ to: "/projects" })}>إلغاء</Button>
        </div>
      </form>
    </PageShell>
  );
}
