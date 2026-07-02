import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { DollarSign, Package, Clock, Star, Plus, TrendingUp } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { PageShell } from "@/components/site/PageShell";
import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/dashboard/seller")({
  head: () => ({ meta: [{ title: "لوحة تحكم البائع — سرعات" }, { name: "robots", content: "noindex" }] }),
  component: SellerDashboard,
});

type Stats = { earnings: number; activeOrders: number; completedOrders: number; rating: number };
type Order = { id: string; price: number; status: string; created_at: string; requirements: string | null };
type Service = { id: string; title: string; status: string; price: number; orders_count: number | null };

function SellerDashboard() {
  const { user, loading } = useAuth();
  const navigate = useNavigate();
  const [stats, setStats] = useState<Stats>({ earnings: 0, activeOrders: 0, completedOrders: 0, rating: 0 });
  const [orders, setOrders] = useState<Order[]>([]);
  const [services, setServices] = useState<Service[]>([]);

  useEffect(() => { if (!loading && !user) navigate({ to: "/auth" }); }, [loading, user, navigate]);

  useEffect(() => {
    if (!user) return;
    (async () => {
      const [{ data: ords }, { data: svs }, { data: fin }] = await Promise.all([
        supabase.from("orders").select("id,price,status,created_at,requirements").eq("seller_id", user.id).order("created_at", { ascending: false }).limit(10),
        supabase.from("services").select("id,title,status,price,orders_count").eq("seller_id", user.id).order("created_at", { ascending: false }).limit(10),
        supabase.rpc("get_my_financials"),
      ]);
      const list = (ords ?? []) as Order[];
      setOrders(list);
      setServices((svs ?? []) as Service[]);
      const earnings = Array.isArray(fin) && fin[0]?.total_earnings ? Number(fin[0].total_earnings) : 0;
      setStats({
        earnings,
        activeOrders: list.filter((o) => ["in_progress", "delivered"].includes(o.status)).length,
        completedOrders: list.filter((o) => o.status === "completed").length,
        rating: 4.8,
      });
    })();
  }, [user]);

  return (
    <PageShell>
      <section className="container mx-auto max-w-7xl px-4 py-10 lg:px-6">
        <div className="mb-8 flex flex-wrap items-center justify-between gap-4">
          <div>
            <h1 className="text-3xl font-extrabold text-primary">لوحة تحكم البائع</h1>
            <p className="mt-1 text-sm text-muted-foreground">مرحباً {user?.user_metadata?.full_name ?? "بك"} 👋</p>
          </div>
          <Button variant="hero" size="lg"><Plus className="h-4 w-4" /> إضافة خدمة جديدة</Button>
        </div>

        <div className="mb-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {[
            { I: DollarSign, l: "إجمالي الأرباح", v: `$${stats.earnings.toFixed(2)}`, c: "text-success" },
            { I: Clock, l: "طلبات نشطة", v: stats.activeOrders, c: "text-accent" },
            { I: Package, l: "طلبات مكتملة", v: stats.completedOrders, c: "text-primary" },
            { I: Star, l: "التقييم", v: stats.rating.toFixed(1), c: "text-warning" },
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
            <div className="flex items-center justify-between border-b border-border p-5">
              <h2 className="font-extrabold text-primary">آخر الطلبات</h2>
              <TrendingUp className="h-4 w-4 text-accent" />
            </div>
            {orders.length === 0 ? (
              <div className="p-8 text-center text-sm text-muted-foreground">لا توجد طلبات بعد</div>
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
            <div className="flex items-center justify-between border-b border-border p-5">
              <h2 className="font-extrabold text-primary">خدماتي</h2>
              <Link to="/services" search={{ q: undefined, category: undefined }} className="text-xs text-accent">عرض الكل</Link>
            </div>
            {services.length === 0 ? (
              <div className="p-8 text-center text-sm text-muted-foreground">
                لم تنشر خدمات بعد
                <div className="mt-3"><Button variant="hero" size="sm"><Plus className="h-4 w-4" /> أضف خدمتك الأولى</Button></div>
              </div>
            ) : (
              <ul className="divide-y divide-border">
                {services.map((s) => (
                  <li key={s.id} className="flex items-center justify-between gap-3 p-4">
                    <div className="min-w-0">
                      <div className="truncate text-sm font-bold text-primary">{s.title}</div>
                      <div className="text-xs text-muted-foreground">{s.orders_count ?? 0} طلب</div>
                    </div>
                    <span className="rounded-full bg-muted px-2.5 py-1 text-xs font-bold">{s.status}</span>
                    <span className="font-extrabold text-primary">${Number(s.price).toFixed(2)}</span>
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