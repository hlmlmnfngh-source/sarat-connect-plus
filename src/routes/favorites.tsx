import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Heart, Star, Clock } from "lucide-react";
import { toast } from "sonner";
import { useAuth } from "@/hooks/use-auth";
import { supabase } from "@/integrations/supabase/client";
import { PageShell, PageHero } from "@/components/site/PageShell";
import { Button } from "@/components/ui/button";

type Favorite = { id: string; service_id: string; service: any | null };

export const Route = createFileRoute("/favorites")({
  head: () => ({ meta: [{ title: "الخدمات المحفوظة — سرعات" }] }),
  component: FavoritesPage,
});

function FavoritesPage() {
  const { user, loading } = useAuth();
  const navigate = useNavigate();
  const [items, setItems] = useState<Favorite[]>([]);
  const [busy, setBusy] = useState(false);

  const load = async () => {
    if (!user) return;
    const { data, error } = await supabase.from("favorites")
      .select("id,service_id,services(id,title,price,delivery_days,rating,reviews_count,gallery_images,profiles!services_seller_id_fkey(full_name,username))")
      .eq("user_id", user.id).order("created_at", { ascending: false });
    if (error) toast.error(error.message);
    else setItems((data ?? []) as unknown as Favorite[]);
  };

  useEffect(() => { if (!loading && !user) navigate({ to: "/auth" }); }, [loading, user, navigate]);
  useEffect(() => { void load(); }, [user]);

  const remove = async (id: string) => {
    setBusy(true);
    const { error } = await supabase.from("favorites").delete().eq("id", id);
    setBusy(false);
    if (error) toast.error(error.message); else setItems(prev => prev.filter(x => x.id !== id));
  };

  if (!user) return null;
  return (
    <PageShell>
      <PageHero title="الخدمات المحفوظة" subtitle="ارجع للخدمات التي تريد مقارنتها أو طلبها لاحقًا." />
      <section className="container mx-auto max-w-6xl px-4 py-10 lg:px-6">
        {items.length === 0 ? (
          <div className="rounded-2xl border border-border bg-card p-12 text-center">
            <Heart className="mx-auto mb-3 h-9 w-9 text-muted-foreground" />
            <p className="font-bold text-primary">لا توجد خدمات محفوظة بعد</p>
            <p className="mt-1 text-sm text-muted-foreground">اضغط حفظ على أي خدمة للعثور عليها هنا.</p>
            <Link to="/services" search={{ q: undefined, category: undefined }}><Button className="mt-5" variant="hero">تصفح الخدمات</Button></Link>
          </div>
        ) : (
          <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {items.map(item => {
              const s = item.service;
              if (!s) return null;
              const cover = s.gallery_images?.[0];
              return (
                <article key={item.id} className="overflow-hidden rounded-2xl border border-border bg-card">
                  <Link to="/services/$id/" params={{ id: s.id }}>
                    <div className="aspect-[16/9] bg-muted">{cover ? <img src={cover} alt={s.title} className="h-full w-full object-cover" /> : null}</div>
                  </Link>
                  <div className="p-5">
                    <Link to="/services/$id/" params={{ id: s.id }} className="line-clamp-2 font-extrabold text-primary hover:text-accent">{s.title}</Link>
                    <p className="mt-1 text-xs text-muted-foreground">{s.profiles?.full_name ?? "مستقل"}</p>
                    <div className="mt-4 flex items-center justify-between text-sm">
                      <span className="font-extrabold text-accent">$ {Number(s.price).toFixed(2)}</span>
                      <span className="flex items-center gap-1 text-muted-foreground"><Clock className="h-3.5 w-3.5" />{s.delivery_days} أيام</span>
                      <span className="flex items-center gap-1"><Star className="h-3.5 w-3.5 fill-accent text-accent" />{Number(s.rating || 0).toFixed(1)}</span>
                    </div>
                    <Button className="mt-4 w-full" variant="outline" disabled={busy} onClick={() => void remove(item.id)}>إزالة من المفضلة</Button>
                  </div>
                </article>
              );
            })}
          </div>
        )}
      </section>
    </PageShell>
  );
}
