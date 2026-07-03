import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { ShoppingBag, Clock, Heart, Wallet, Plus, ArrowDownLeft, ArrowUpRight, RotateCcw } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { PageShell } from "@/components/site/PageShell";
import { Button } from "@/components/ui/button";
import { TransactionDetailsDialog, type TxnLike } from "@/components/TransactionDetailsDialog";

export const Route = createFileRoute("/dashboard/buyer")({
  head: () => ({ meta: [{ title: "لوحة تحكم المشتري — سرعات" }, { name: "robots", content: "noindex" }] }),
  component: BuyerDashboard,
});

type Order = { id: string; price: number; status: string; created_at: string };
type Project = { id: string; title: string; status: string; budget_min: number | null; budget_max: number | null };
type Txn = {
  id: string;
  type: "earning" | "withdrawal" | "purchase" | "refund";
  amount: number;
  currency: string;
  status: "pending" | "completed" | "failed";
  description: string | null;
  reference_id: string | null;
  created_at: string;
  stripe_session_id?: string | null;
  stripe_payment_intent_id?: string | null;
  stripe_refund_id?: string | null;
};

function BuyerDashboard() {
  const { user, loading } = useAuth();
  const navigate = useNavigate();
  const [orders, setOrders] = useState<Order[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [favCount, setFavCount] = useState(0);
  const [spent, setSpent] = useState(0);
  const [refunded, setRefunded] = useState(0);
  const [pending, setPending] = useState(0);
  const [txns, setTxns] = useState<Txn[]>([]);
  const [selected, setSelected] = useState<TxnLike | null>(null);

  useEffect(() => { if (!loading && !user) navigate({ to: "/auth" }); }, [loading, user, navigate]);

  useEffect(() => {
    if (!user) return;
    (async () => {
      const [{ data: ords }, { data: projs }, { count: favs }, { data: allTxns }] = await Promise.all([
        supabase.from("orders").select("id,price,status,created_at").eq("buyer_id", user.id).order("created_at", { ascending: false }).limit(10),
        supabase.from("projects").select("id,title,status,budget_min,budget_max").eq("buyer_id", user.id).order("created_at", { ascending: false }).limit(10),
        supabase.from("favorites").select("id", { count: "exact", head: true }).eq("user_id", user.id),
        supabase
          .from("transactions")
          .select("id,type,amount,currency,status,description,reference_id,created_at,stripe_session_id,stripe_payment_intent_id,stripe_refund_id")
          .eq("user_id", user.id)
          .order("created_at", { ascending: false })
          .limit(50),
      ]);
      setOrders((ords ?? []) as Order[]);
      setProjects((projs ?? []) as Project[]);
      setFavCount(favs ?? 0);
      const all = ((allTxns ?? []) as Txn[]);
      setTxns(all);
      const done = all.filter((t) => t.status === "completed");
      setSpent(done.filter((t) => t.type === "purchase").reduce((s, t) => s + Number(t.amount), 0));
      setRefunded(done.filter((t) => t.type === "refund").reduce((s, t) => s + Number(t.amount), 0));
      setPending(
        all.filter((t) => t.status === "pending" && t.type === "purchase").reduce((s, t) => s + Number(t.amount), 0),
      );
    })();
  }, [user]);

  const activeOrders = orders.filter((o) => ["pending", "in_progress", "delivered"].includes(o.status)).length;
  const balance = refunded; // buyer wallet credit from refunds

  return (
    <PageShell>
      <section className="container mx-auto max-w-7xl px-4 py-10 lg:px-6">
        <div className="mb-8 flex flex-wrap items-center justify-between gap-4">
          <div>
            <h1 className="text-3xl font-extrabold text-primary">لوحة تحكم المشتري</h1>
            <p className="mt-1 text-sm text-muted-foreground">مرحباً {user?.user_metadata?.full_name ?? "بك"} 👋</p>
          </div>
          <div className="flex gap-2">
            <Link to="/services" search={{ q: undefined, category: undefined }}><Button variant="ghost" size="lg">تصفح الخدمات</Button></Link>
            <Link to="/projects"><Button variant="hero" size="lg"><Plus className="h-4 w-4" /> انشر مشروعاً</Button></Link>
          </div>
        </div>

        <div className="mb-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {[
            { I: Wallet, l: "رصيد المحفظة", v: `$${balance.toFixed(2)}`, c: "text-success" },
            { I: ShoppingBag, l: "إجمالي المصروف", v: `$${spent.toFixed(2)}`, c: "text-primary" },
            { I: Clock, l: "طلبات نشطة", v: activeOrders, c: "text-accent" },
            { I: Heart, l: "المفضلة", v: favCount, c: "text-destructive" },
          ].map((s) => (
            <div key={s.l} className="rounded-2xl border border-border bg-card p-5 shadow-soft">
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">{s.l}</span>
                <s.I className={`h-5 w-5 ${s.c}`} />
              </div>
              <div className="mt-2 text-3xl font-extrabold text-primary">{s.v}</div>
            </div>
          ))}
        </div>

        <div className="mb-6 rounded-2xl border border-border bg-card shadow-soft">
          <div className="flex items-center justify-between border-b border-border p-5">
            <div>
              <h2 className="font-extrabold text-primary">المحفظة وسجل المعاملات</h2>
              {pending > 0 && (
                <p className="mt-1 text-xs text-muted-foreground">قيد الانتظار: ${pending.toFixed(2)}</p>
              )}
            </div>
            <Link to="/wallet"><Button variant="ghost" size="sm">عرض الكل</Button></Link>
          </div>
          {txns.length === 0 ? (
            <div className="p-8 text-center text-sm text-muted-foreground">لا توجد معاملات بعد</div>
          ) : (
            <ul className="divide-y divide-border">
              {txns.slice(0, 8).map((t) => {
                const credit = t.type === "refund" || t.type === "earning";
                const Icon = t.type === "refund" ? RotateCcw : credit ? ArrowDownLeft : ArrowUpRight;
                const label =
                  t.type === "purchase" ? "شراء" : t.type === "refund" ? "استرداد" : t.type === "earning" ? "أرباح" : "سحب";
                return (
                  <li key={t.id}>
                    <button
                      type="button"
                      onClick={() => setSelected(t)}
                      className="flex w-full items-center justify-between gap-3 p-4 text-right hover:bg-muted/40"
                    >
                    <div className="flex min-w-0 items-center gap-3">
                      <span className={`grid h-9 w-9 place-items-center rounded-full ${credit ? "bg-success/10 text-success" : "bg-muted text-primary"}`}>
                        <Icon className="h-4 w-4" />
                      </span>
                      <div className="min-w-0">
                        <div className="truncate text-sm font-bold text-primary">{label}</div>
                        <div className="truncate text-xs text-muted-foreground">
                          {t.description ?? t.reference_id ?? "—"} · {new Date(t.created_at).toLocaleDateString("ar")}
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className={`rounded-full px-2 py-0.5 text-[10px] font-bold ${
                        t.status === "completed" ? "bg-success/10 text-success" :
                        t.status === "pending" ? "bg-accent/10 text-accent" : "bg-destructive/10 text-destructive"
                      }`}>{t.status}</span>
                      <span className={`font-extrabold ${credit ? "text-success" : "text-primary"}`}>
                        {credit ? "+" : "-"}${Number(t.amount).toFixed(2)}
                      </span>
                    </div>
                    </button>
                  </li>
                );
              })}
            </ul>
          )}
        </div>

        <TransactionDetailsDialog
          txn={selected}
          open={selected !== null}
          onOpenChange={(v) => !v && setSelected(null)}
        />

        <div className="grid gap-6 lg:grid-cols-2">
          <div className="rounded-2xl border border-border bg-card shadow-soft">
            <div className="border-b border-border p-5"><h2 className="font-extrabold text-primary">طلباتي</h2></div>
            {orders.length === 0 ? (
              <div className="p-8 text-center text-sm text-muted-foreground">
                لا توجد طلبات بعد
                <div className="mt-3"><Link to="/services" search={{ q: undefined, category: undefined }}><Button variant="hero" size="sm">تصفح الخدمات</Button></Link></div>
              </div>
            ) : (
              <ul className="divide-y divide-border">
                {orders.map((o) => (
                  <li key={o.id} className="flex items-center justify-between gap-3 p-4">
                    <div className="min-w-0">
                      <div className="truncate text-sm font-bold text-primary">طلب #{o.id.slice(0, 8)}</div>
                      <div className="text-xs text-muted-foreground">{new Date(o.created_at).toLocaleDateString("ar")}</div>
                    </div>
                    <span className="rounded-full bg-accent/10 px-2.5 py-1 text-xs font-bold text-accent">{o.status}</span>
                    <span className="font-extrabold text-primary">${Number(o.price).toFixed(2)}</span>
                  </li>
                ))}
              </ul>
            )}
          </div>

          <div className="rounded-2xl border border-border bg-card shadow-soft">
            <div className="border-b border-border p-5"><h2 className="font-extrabold text-primary">مشاريعي</h2></div>
            {projects.length === 0 ? (
              <div className="p-8 text-center text-sm text-muted-foreground">
                لم تنشر مشاريع بعد
                <div className="mt-3"><Link to="/projects"><Button variant="hero" size="sm"><Plus className="h-4 w-4" /> انشر مشروعاً</Button></Link></div>
              </div>
            ) : (
              <ul className="divide-y divide-border">
                {projects.map((p) => (
                  <li key={p.id} className="flex items-center justify-between gap-3 p-4">
                    <div className="min-w-0">
                      <div className="truncate text-sm font-bold text-primary">{p.title}</div>
                      <div className="text-xs text-muted-foreground">
                        ${p.budget_min ?? 0} - ${p.budget_max ?? 0}
                      </div>
                    </div>
                    <span className="rounded-full bg-muted px-2.5 py-1 text-xs font-bold">{p.status}</span>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      </section>
    </PageShell>
  );
}