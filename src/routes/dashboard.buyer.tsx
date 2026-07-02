import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { ShoppingBag, Clock, Heart, Wallet, Plus } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { PageShell } from "@/components/site/PageShell";
import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/dashboard/buyer")({
  head: () => ({ meta: [{ title: "لوحة تحكم المشتري — سرعات" }, { name: "robots", content: "noindex" }] }),
  component: BuyerDashboard,
});

type Order = { id: string; price: number; status: string; created_at: string };
type Project = { id: string; title: string; status: string; budget_min: number | null; budget_max: number | null };

function BuyerDashboard() {
  const { user, loading } = useAuth();
  const navigate = useNavigate();
  const [orders, setOrders] = useState<Order[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [favCount, setFavCount] = useState(0);
  const [spent, setSpent] = useState(0);

  useEffect(() => { if (!loading && !user) navigate({ to: "/auth" }); }, [loading, user, navigate]);

  useEffect(() => {
    if (!user) return;
    (async () => {
      const [{ data: ords }, { data: projs }, { count: favs }, { data: txns }] = await Promise.all([
        supabase.from("orders").select("id,price,status,created_at").eq("buyer_id", user.id).order("created_at", { ascending: false }).limit(10),
        supabase.from("projects").select("id,title,status,budget_min,budget_max").eq("buyer_id", user.id).order("created_at", { ascending: false }).limit(10),
        supabase.from("favorites").select("id", { count: "exact", head: true }).eq("user_id", user.id),
        supabase.from("transactions").select("amount").eq("user_id", user.id).eq("type", "purchase").eq("status", "completed"),
      ]);
      setOrders((ords ?? []) as Order[]);
      setProjects((projs ?? []) as Project[]);
      setFavCount(favs ?? 0);
      setSpent((txns ?? []).reduce((s, t) => s + Number(t.amount), 0));
    })();
  }, [user]);

  const activeOrders = orders.filter((o) => ["pending", "in_progress", "delivered"].includes(o.status)).length;

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
            { I: Wallet, l: "إجمالي المصروف", v: `$${spent.toFixed(2)}`, c: "text-primary" },
            { I: Clock, l: "طلبات نشطة", v: activeOrders, c: "text-accent" },
            { I: ShoppingBag, l: "إجمالي الطلبات", v: orders.length, c: "text-success" },
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