import { createFileRoute, Link, notFound } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { startCheckout } from "@/lib/checkout";
import { Header, type Mode } from "@/components/site/Header";
import { Footer } from "@/components/site/Footer";
import { Button } from "@/components/ui/button";
import { Clock, Users, ArrowLeft } from "lucide-react";

export const Route = createFileRoute("/projects/$id")({
  head: () => ({
    meta: [
      { title: "تفاصيل المشروع — سرعات" },
      { name: "description", content: "تفاصيل المشروع والعروض المقدّمة." },
    ],
  }),
  component: ProjectDetail,
  errorComponent: ({ error }) => (
    <div className="p-8 text-center text-sm text-muted-foreground">{error.message}</div>
  ),
  notFoundComponent: () => (
    <div className="p-16 text-center">
      <div className="mb-2 text-2xl font-bold">المشروع غير موجود</div>
      <Link to="/projects" className="text-accent">تصفّح كل المشاريع</Link>
    </div>
  ),
});

const PROPOSAL_STATUS_LABELS: Record<string, string> = {
  pending: "قيد المراجعة",
  accepted: "مقبول",
  rejected: "مرفوض",
  withdrawn: "مسحوب",
};

function ProjectDetail() {
  const { id } = Route.useParams();
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [mode, setMode] = useState<Mode>("projects");
  const [showForm, setShowForm] = useState(false);
  const [coverLetter, setCoverLetter] = useState("");
  const [price, setPrice] = useState("");
  const [deliveryDays, setDeliveryDays] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [busyProposalId, setBusyProposalId] = useState<string | null>(null);

  const { data, isLoading } = useQuery({
    queryKey: ["project", id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("projects")
        .select("*, categories(name_ar, slug), profiles!projects_buyer_id_fkey(full_name, username, avatar_url)")
        .eq("id", id)
        .maybeSingle();
      if (error) throw error;
      if (!data) throw notFound();
      return data;
    },
  });

  const isOwner = !!user && data?.buyer_id === user.id;

  const { data: proposals } = useQuery({
    queryKey: ["proposals", id, user?.id, isOwner],
    enabled: !!user && !!data,
    queryFn: async () => {
      let q = supabase
        .from("proposals")
        .select("id,cover_letter,price,delivery_days,status,created_at,freelancer_id,profiles!proposals_freelancer_id_fkey(full_name,username,avatar_url)")
        .eq("project_id", id)
        .order("created_at", { ascending: false });
      if (!isOwner) q = q.eq("freelancer_id", user!.id);
      const { data, error } = await q;
      if (error) throw error;
      return data;
    },
  });

  const myProposal = !isOwner ? proposals?.[0] : undefined;

  async function submitProposal() {
    setFormError(null);
    const priceNum = Number(price);
    const daysNum = Number(deliveryDays);
    if (!coverLetter.trim()) { setFormError("اكتب رسالة تعريفية بعرضك."); return; }
    if (!priceNum || priceNum <= 0) { setFormError("أدخل سعراً صحيحاً."); return; }
    if (!daysNum || daysNum <= 0) { setFormError("أدخل مدة تسليم صحيحة."); return; }
    setSubmitting(true);
    try {
      const { error } = await supabase.from("proposals").insert({
        project_id: id,
        freelancer_id: user!.id,
        cover_letter: coverLetter.trim(),
        price: priceNum,
        delivery_days: daysNum,
      });
      if (error) throw error;
      setShowForm(false);
      setCoverLetter(""); setPrice(""); setDeliveryDays("");
      queryClient.invalidateQueries({ queryKey: ["proposals", id] });
    } catch (err) {
      setFormError(err instanceof Error ? err.message : "تعذّر إرسال العرض.");
    } finally {
      setSubmitting(false);
    }
  }

  async function acceptProposal(proposalId: string, freelancerId: string, proposalPrice: number) {
    setBusyProposalId(proposalId);
    try {
      await supabase.from("proposals").update({ status: "accepted" }).eq("id", proposalId);
      const others = (proposals ?? []).filter((p) => p.id !== proposalId && p.status === "pending");
      await Promise.all(others.map((p) => supabase.from("proposals").update({ status: "rejected" }).eq("id", p.id)));
      await startCheckout({
        kind: "project",
        project_id: id,
        seller_id: freelancerId,
        amount: proposalPrice,
        title: data?.title ?? "مشروع",
      });
    } catch (err) {
      setBusyProposalId(null);
      alert(err instanceof Error ? err.message : "تعذّر قبول العرض.");
    }
  }

  async function rejectProposal(proposalId: string) {
    setBusyProposalId(proposalId);
    try {
      await supabase.from("proposals").update({ status: "rejected" }).eq("id", proposalId);
      queryClient.invalidateQueries({ queryKey: ["proposals", id] });
    } finally {
      setBusyProposalId(null);
    }
  }

  if (isLoading) return <div className="min-h-screen bg-background"><Header mode={mode} onModeChange={setMode} /><div className="p-16 text-center text-muted-foreground">جارٍ التحميل...</div></div>;
  const p: any = data;
  if (!p) return null;

  return (
    <div className="min-h-screen bg-background">
      <Header mode={mode} onModeChange={setMode} />
      <div className="container mx-auto grid gap-8 px-4 py-8 lg:grid-cols-[1fr_340px] lg:px-6">
        <div>
          <div className="mb-4 text-sm text-muted-foreground">
            <Link to="/projects" className="hover:text-accent">المشاريع</Link>
            {p.categories && (<><span className="mx-2">/</span><span>{p.categories.name_ar}</span></>)}
          </div>
          <div className="mb-4 flex flex-wrap items-start justify-between gap-3">
            <h1 className="text-2xl font-extrabold text-primary md:text-3xl">{p.title}</h1>
            <span className="rounded-full bg-success/10 px-3 py-1 text-xs font-bold text-success">
              {p.status === "open" ? "مفتوح" : p.status === "in_progress" ? "قيد التنفيذ" : p.status === "completed" ? "مكتمل" : "ملغي"}
            </span>
          </div>
          <section className="mb-6 rounded-2xl border border-border bg-card p-6">
            <h2 className="mb-3 text-lg font-bold text-primary">وصف المشروع</h2>
            <p className="whitespace-pre-line leading-relaxed text-foreground/85">{p.description}</p>
          </section>

          {(p.skills_required as string[] | null)?.length ? (
            <section className="mb-6 rounded-2xl border border-border bg-card p-6">
              <h2 className="mb-3 text-lg font-bold text-primary">المهارات المطلوبة</h2>
              <div className="flex flex-wrap gap-2">
                {(p.skills_required as string[]).map((s) => (
                  <span key={s} className="rounded-full bg-muted px-3 py-1 text-xs font-semibold">{s}</span>
                ))}
              </div>
            </section>
          ) : null}

          {/* Proposals: owner sees all bids, freelancer sees their own status */}
          {user && (
            <section className="rounded-2xl border border-border bg-card p-6">
              <h2 className="mb-3 text-lg font-bold text-primary">
                {isOwner ? `العروض المقدّمة (${proposals?.length ?? 0})` : "عرضي"}
              </h2>
              {!proposals || proposals.length === 0 ? (
                <p className="text-sm text-muted-foreground">لا توجد عروض بعد.</p>
              ) : (
                <ul className="space-y-3">
                  {proposals.map((prop: any) => (
                    <li key={prop.id} className="rounded-xl border border-border p-4">
                      <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
                        <div className="flex items-center gap-2">
                          {isOwner && (
                            <span className="text-sm font-bold text-primary">
                              {prop.profiles?.full_name ?? "مستقل"} <span className="text-xs text-muted-foreground">@{prop.profiles?.username}</span>
                            </span>
                          )}
                          <span className={`rounded-full px-2 py-0.5 text-xs font-bold ${
                            prop.status === "accepted" ? "bg-success/10 text-success" :
                            prop.status === "rejected" ? "bg-destructive/10 text-destructive" :
                            "bg-accent/10 text-accent"
                          }`}>
                            {PROPOSAL_STATUS_LABELS[prop.status] ?? prop.status}
                          </span>
                        </div>
                        <span className="font-extrabold text-primary">${Number(prop.price).toLocaleString()} · {prop.delivery_days} يوم</span>
                      </div>
                      <p className="whitespace-pre-line text-sm text-foreground/85">{prop.cover_letter}</p>
                      {isOwner && prop.status === "pending" && p.status === "open" && (
                        <div className="mt-3 flex gap-2">
                          <Button
                            variant="hero"
                            size="sm"
                            disabled={busyProposalId === prop.id}
                            onClick={() => acceptProposal(prop.id, prop.freelancer_id, Number(prop.price))}
                          >
                            {busyProposalId === prop.id ? "جارٍ..." : "قبول والدفع"}
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            disabled={busyProposalId === prop.id}
                            onClick={() => rejectProposal(prop.id)}
                          >
                            رفض
                          </Button>
                        </div>
                      )}
                    </li>
                  ))}
                </ul>
              )}
            </section>
          )}
        </div>

        <aside className="lg:sticky lg:top-20 lg:self-start">
          <div className="rounded-2xl border border-border bg-card p-5 shadow-elevated">
            <div className="mb-4">
              <div className="text-xs text-muted-foreground">الميزانية</div>
              <div className="text-2xl font-extrabold text-accent">
                ${Number(p.budget_min).toLocaleString()} - ${Number(p.budget_max).toLocaleString()}
              </div>
            </div>
            <div className="mb-4 space-y-2 border-y border-border py-3 text-sm">
              <div className="flex items-center justify-between"><span className="flex items-center gap-2 text-muted-foreground"><Clock className="h-4 w-4" /> مدة التنفيذ</span><span className="font-bold">{p.deadline_days} يوم</span></div>
              <div className="flex items-center justify-between"><span className="flex items-center gap-2 text-muted-foreground"><Users className="h-4 w-4" /> العروض المقدّمة</span><span className="font-bold">{p.proposals_count ?? 0}</span></div>
            </div>
            <div className="mb-5 flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-gradient-accent text-sm font-bold text-accent-foreground">
                {(p.profiles?.full_name ?? "؟")[0]}
              </div>
              <div>
                <div className="text-sm font-bold">{p.profiles?.full_name ?? "صاحب مشروع"}</div>
                <div className="text-xs text-muted-foreground">@{p.profiles?.username ?? "user"}</div>
              </div>
            </div>

            {!user ? (
              <Link to="/auth">
                <Button variant="hero" size="lg" className="w-full">
                  قدّم عرضك
                  <ArrowLeft className="h-4 w-4" />
                </Button>
              </Link>
            ) : isOwner ? (
              <p className="text-center text-xs text-muted-foreground">هذا مشروعك — راجع العروض المقدّمة أعلاه.</p>
            ) : myProposal ? (
              <p className="text-center text-xs text-muted-foreground">
                لقد قدّمت عرضاً بالفعل ({PROPOSAL_STATUS_LABELS[myProposal.status] ?? myProposal.status}).
              </p>
            ) : p.status !== "open" ? (
              <p className="text-center text-xs text-muted-foreground">هذا المشروع لم يعد يقبل عروضاً جديدة.</p>
            ) : !showForm ? (
              <Button variant="hero" size="lg" className="w-full" onClick={() => setShowForm(true)}>
                قدّم عرضك
                <ArrowLeft className="h-4 w-4" />
              </Button>
            ) : (
              <div className="space-y-3">
                <textarea
                  value={coverLetter}
                  onChange={(e) => setCoverLetter(e.target.value)}
                  placeholder="اكتب رسالة تعريفية بعرضك..."
                  rows={4}
                  className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm"
                />
                <div className="flex gap-2">
                  <input
                    type="number"
                    min={0}
                    value={price}
                    onChange={(e) => setPrice(e.target.value)}
                    placeholder="السعر ($)"
                    className="w-1/2 rounded-md border border-border bg-background px-3 py-2 text-sm"
                  />
                  <input
                    type="number"
                    min={1}
                    value={deliveryDays}
                    onChange={(e) => setDeliveryDays(e.target.value)}
                    placeholder="مدة التسليم (يوم)"
                    className="w-1/2 rounded-md border border-border bg-background px-3 py-2 text-sm"
                  />
                </div>
                {formError && <p className="text-xs text-destructive">{formError}</p>}
                <div className="flex gap-2">
                  <Button variant="hero" size="sm" className="flex-1" disabled={submitting} onClick={submitProposal}>
                    {submitting ? "جارٍ الإرسال…" : "إرسال العرض"}
                  </Button>
                  <Button variant="outline" size="sm" onClick={() => setShowForm(false)}>إلغاء</Button>
                </div>
              </div>
            )}
          </div>
        </aside>
      </div>
      <Footer />
    </div>
  );
}
