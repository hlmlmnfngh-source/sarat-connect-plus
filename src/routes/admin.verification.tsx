import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { CheckCircle2, XCircle, ExternalLink, ShieldCheck } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { PageShell, PageHero } from "@/components/site/PageShell";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";

type Item = {
  id: string; username: string | null; full_name: string | null; email_verified: boolean;
  verification_submitted_at: string | null; verification_notes: string | null; document_url: string | null;
};

export const Route = createFileRoute("/admin/verification")({
  head: () => ({ meta: [{ title: "مراجعة توثيق الهوية — سرعات" }, { name: "robots", content: "noindex" }] }),
  component: AdminVerificationPage,
});

function AdminVerificationPage() {
  const { user, loading } = useAuth();
  const [items, setItems] = useState<Item[]>([]);
  const [busy, setBusy] = useState<string | null>(null);
  const [notes, setNotes] = useState<Record<string,string>>({});
  const [denied, setDenied] = useState(false);

  const load = async () => {
    const { data, error } = await supabase.functions.invoke("admin-verification", { body: { action: "list" } });
    if (error) { setDenied(true); return; }
    setItems((data?.items ?? []) as Item[]);
  };

  useEffect(() => { if (!loading && user) void load(); }, [loading, user]);

  const review = async (id: string, status: "approved"|"rejected") => {
    setBusy(id + status);
    const { error } = await supabase.functions.invoke("admin-verification", { body: { action: "review", user_id: id, status, notes: notes[id] ?? "" } });
    setBusy(null);
    if (error) { toast.error(error.message); return; }
    toast.success(status === "approved" ? "تم اعتماد الهوية" : "تم رفض الوثيقة");
    setItems((prev) => prev.filter((x) => x.id !== id));
  };

  if (denied) return <PageShell><div className="container mx-auto px-4 py-20 text-center text-destructive">لا تملك صلاحية الوصول إلى لوحة مراجعة الهوية.</div></PageShell>;

  return (
    <PageShell>
      <PageHero title="مراجعة توثيق الهوية" subtitle="راجع الوثائق المرفوعة واتخذ قرار الاعتماد أو الرفض مع سبب واضح." />
      <section className="container mx-auto max-w-5xl space-y-5 px-4 py-10 lg:px-6">
        {items.length === 0 ? (
          <div className="rounded-2xl border border-border bg-card p-10 text-center text-muted-foreground"><ShieldCheck className="mx-auto mb-3 h-8 w-8" />لا توجد طلبات توثيق معلقة.</div>
        ) : items.map((item) => (
          <article key={item.id} className="rounded-2xl border border-border bg-card p-6">
            <div className="flex flex-wrap items-start justify-between gap-4">
              <div><h2 className="font-extrabold text-primary">{item.full_name || item.username || "مستخدم"}</h2><p className="text-xs text-muted-foreground">البريد موثّق: {item.email_verified ? "نعم" : "لا"} · أُرسل: {item.verification_submitted_at ? new Date(item.verification_submitted_at).toLocaleString("ar") : "—"}</p></div>
              {item.document_url && <a href={item.document_url} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 text-sm font-bold text-accent"><ExternalLink className="h-4 w-4" />فتح الوثيقة</a>}
            </div>
            <Textarea className="mt-4" placeholder="ملاحظة للمستخدم عند الرفض (اختياري)" value={notes[item.id] ?? ""} onChange={e=>setNotes(n=>({...n,[item.id]:e.target.value}))} />
            <div className="mt-4 flex gap-2">
              <Button variant="hero" disabled={!!busy} onClick={()=>void review(item.id,"approved")}><CheckCircle2 className="h-4 w-4" /> اعتماد</Button>
              <Button variant="destructive" disabled={!!busy} onClick={()=>void review(item.id,"rejected")}><XCircle className="h-4 w-4" /> رفض</Button>
            </div>
          </article>
        ))}
      </section>
    </PageShell>
  );
}
