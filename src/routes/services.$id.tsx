import { createFileRoute, Link, notFound } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Header, type Mode } from "@/components/site/Header";
import { Footer } from "@/components/site/Footer";
import { Button } from "@/components/ui/button";
import { Star, Clock, RefreshCw, CheckCircle2, ArrowLeft } from "lucide-react";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/services/$id")({
  head: () => ({
    meta: [
      { title: "تفاصيل الخدمة — سرعات" },
      { name: "description", content: "تفاصيل الخدمة، الباقات، والتقييمات." },
    ],
  }),
  component: ServiceDetail,
  errorComponent: ({ error }) => (
    <div className="p-8 text-center text-sm text-muted-foreground">{error.message}</div>
  ),
  notFoundComponent: () => (
    <div className="p-16 text-center">
      <div className="mb-2 text-2xl font-bold">الخدمة غير موجودة</div>
      <Link to="/services" search={{ q: undefined, category: undefined }} className="text-accent">تصفّح كل الخدمات</Link>
    </div>
  ),
});

type Pkg = {
  id: string;
  package_type: "basic" | "standard" | "premium";
  title: string;
  description: string | null;
  price: number;
  delivery_days: number;
  revisions: number;
  features: string[] | null;
};

function ServiceDetail() {
  const { id } = Route.useParams();
  const [mode, setMode] = useState<Mode>("services");
  const [pick, setPick] = useState<Pkg["package_type"]>("basic");

  const svcQ = useQuery({
    queryKey: ["service", id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("services")
        .select("*, categories(name_ar, slug), profiles!services_seller_id_fkey(id, full_name, avatar_url, username)")
        .eq("id", id)
        .eq("status", "active")
        .maybeSingle();
      if (error) throw error;
      if (!data) throw notFound();
      return data;
    },
  });

  const pkgsQ = useQuery({
    queryKey: ["packages", id],
    queryFn: async () => {
      const { data, error } = await supabase.from("service_packages").select("*").eq("service_id", id);
      if (error) throw error;
      return (data ?? []) as Pkg[];
    },
  });

  if (svcQ.isLoading) {
    return <div className="min-h-screen bg-background"><Header mode={mode} onModeChange={setMode} /><div className="p-16 text-center text-muted-foreground">جارٍ التحميل...</div></div>;
  }
  const s = svcQ.data;
  if (!s) return null;

  const pkgs = pkgsQ.data ?? [];
  const active = pkgs.find((p) => p.package_type === pick) ?? pkgs[0];
  const cover = (s.gallery_images as string[] | null)?.[0];
  const seller = (s as any).profiles;

  const price = active ? Number(active.price) : Number(s.price);
  const commission = +(price * 0.2).toFixed(2);
  const total = +(price + commission).toFixed(2);

  return (
    <div className="min-h-screen bg-background">
      <Header mode={mode} onModeChange={setMode} />
      <div className="container mx-auto grid gap-8 px-4 py-8 lg:grid-cols-[1fr_360px] lg:px-6">
        <div>
          {/* breadcrumb */}
          <div className="mb-4 text-sm text-muted-foreground">
            <Link to="/services" search={{ q: undefined, category: undefined }} className="hover:text-accent">الخدمات</Link>
            {(s as any).categories && (
              <>
                <span className="mx-2">/</span>
                <Link to="/services" search={{ q: undefined, category: (s as any).categories.slug }} className="hover:text-accent">
                  {(s as any).categories.name_ar}
                </Link>
              </>
            )}
          </div>

          <h1 className="mb-4 text-2xl font-extrabold text-primary md:text-3xl">{s.title}</h1>

          <div className="mb-6 flex flex-wrap items-center gap-4">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-gradient-accent text-sm font-bold text-accent-foreground">
                {(seller?.full_name ?? "؟")[0]}
              </div>
              <div>
                <div className="text-sm font-bold">{seller?.full_name ?? "مستقل"}</div>
                <div className="text-xs text-muted-foreground">@{seller?.username ?? "user"}</div>
              </div>
            </div>
            <div className="flex items-center gap-1 text-sm">
              <Star className="h-4 w-4 fill-accent text-accent" />
              <span className="font-bold">{s.rating?.toFixed(1) ?? "جديد"}</span>
              {s.reviews_count ? <span className="text-muted-foreground">({s.reviews_count} تقييم)</span> : null}
            </div>
          </div>

          <div className="mb-8 overflow-hidden rounded-2xl border border-border bg-gradient-to-br from-primary/90 to-primary-glow">
            <div className="relative aspect-[16/9]">
              {cover ? (
                <img src={cover} alt={s.title} className="h-full w-full object-cover" />
              ) : (
                <div className="flex h-full items-center justify-center text-6xl font-black text-white/10">سرعات</div>
              )}
            </div>
          </div>

          <section className="mb-8 rounded-2xl border border-border bg-card p-6">
            <h2 className="mb-3 text-lg font-bold text-primary">وصف الخدمة</h2>
            <p className="whitespace-pre-line leading-relaxed text-foreground/85">{s.description}</p>
          </section>

          {(s.tags as string[] | null)?.length ? (
            <div className="mb-8 flex flex-wrap gap-2">
              {(s.tags as string[]).map((t) => (
                <span key={t} className="rounded-full bg-muted px-3 py-1 text-xs font-semibold text-foreground/70">#{t}</span>
              ))}
            </div>
          ) : null}
        </div>

        {/* Packages sidebar */}
        <aside className="lg:sticky lg:top-20 lg:self-start">
          <div className="rounded-2xl border border-border bg-card shadow-elevated">
            {pkgs.length > 0 && (
              <div className="flex border-b border-border">
                {(["basic", "standard", "premium"] as const).map((t) => {
                  const has = pkgs.some((p) => p.package_type === t);
                  if (!has) return null;
                  return (
                    <button
                      key={t}
                      onClick={() => setPick(t)}
                      className={cn(
                        "flex-1 px-2 py-3 text-sm font-bold transition",
                        pick === t ? "border-b-2 border-accent text-accent" : "text-muted-foreground hover:text-foreground",
                      )}
                    >
                      {t === "basic" ? "أساسية" : t === "standard" ? "متوسطة" : "متقدمة"}
                    </button>
                  );
                })}
              </div>
            )}
            <div className="p-5">
              {active ? (
                <>
                  <div className="mb-1 font-bold text-primary">{active.title}</div>
                  {active.description && <p className="mb-4 text-sm text-muted-foreground">{active.description}</p>}
                  <div className="mb-4 text-3xl font-extrabold text-accent">
                    <span className="text-lg">$</span>{Number(active.price).toLocaleString("en-US")}
                  </div>
                  <div className="mb-4 flex items-center gap-4 text-sm text-muted-foreground">
                    <span className="flex items-center gap-1"><Clock className="h-4 w-4" /> {active.delivery_days} يوم</span>
                    <span className="flex items-center gap-1"><RefreshCw className="h-4 w-4" /> {active.revisions} تعديلات</span>
                  </div>
                  {active.features?.length ? (
                    <ul className="mb-5 space-y-2 text-sm">
                      {active.features.map((f) => (
                        <li key={f} className="flex items-start gap-2">
                          <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-success" />
                          <span>{f}</span>
                        </li>
                      ))}
                    </ul>
                  ) : null}
                </>
              ) : (
                <>
                  <div className="mb-4 text-3xl font-extrabold text-accent">
                    <span className="text-lg">$</span>{Number(s.price).toLocaleString("en-US")}
                  </div>
                  <div className="mb-4 flex items-center gap-4 text-sm text-muted-foreground">
                    <span className="flex items-center gap-1"><Clock className="h-4 w-4" /> {s.delivery_days} يوم</span>
                    <span className="flex items-center gap-1"><RefreshCw className="h-4 w-4" /> {s.revisions ?? 0} تعديلات</span>
                  </div>
                </>
              )}

              <div className="mb-5 rounded-xl bg-muted/60 p-3 text-xs text-foreground/80">
                <div className="mb-1 flex justify-between"><span>سعر الخدمة</span><span>${price.toFixed(2)}</span></div>
                <div className="mb-1 flex justify-between text-muted-foreground"><span>عمولة المنصة (20%)</span><span>${commission.toFixed(2)}</span></div>
                <div className="mt-2 flex justify-between border-t border-border pt-2 font-bold text-primary"><span>الإجمالي</span><span>${total.toFixed(2)}</span></div>
              </div>

              <Link to="/auth">
                <Button variant="hero" size="lg" className="w-full">
                  اطلب الآن
                  <ArrowLeft className="h-4 w-4" />
                </Button>
              </Link>
              <Link to="/messages" className="mt-2 block text-center text-sm font-semibold text-muted-foreground hover:text-accent">
                تواصل مع البائع
              </Link>
            </div>
          </div>
        </aside>
      </div>
      <Footer />
    </div>
  );
}