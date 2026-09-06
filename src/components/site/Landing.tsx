import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  Code2, Palette, Megaphone, PenTool, Video, Music, Languages, Briefcase, Bot, BarChart3,
  Search, ArrowLeft, CheckCircle2, Star, TrendingUp, Users, Zap, Shield, Clock,
  Sparkles, ChevronLeft, LayoutGrid, ShieldCheck, MessagesSquare,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Header, type Mode } from "./Header";
import { Footer } from "./Footer";
import { cn } from "@/lib/utils";
import { Link } from "@tanstack/react-router";
import { supabase } from "@/integrations/supabase/client";

const ICONS: Record<string, typeof Code2> = {
  Code2, Palette, Megaphone, PenTool, Video, Music, Languages, Briefcase, Bot, BarChart3,
};

const CAT_COLORS = [
  "from-blue-500/10 to-blue-500/5",
  "from-pink-500/10 to-pink-500/5",
  "from-orange-500/10 to-orange-500/5",
  "from-violet-500/10 to-violet-500/5",
  "from-red-500/10 to-red-500/5",
  "from-emerald-500/10 to-emerald-500/5",
  "from-cyan-500/10 to-cyan-500/5",
  "from-amber-500/10 to-amber-500/5",
  "from-indigo-500/10 to-indigo-500/5",
  "from-teal-500/10 to-teal-500/5",
];

function Counter({ to, suffix = "" }: { to: number; suffix?: string }) {
  const [n, setN] = useState(0);
  useEffect(() => {
    let raf = 0; const start = performance.now(); const dur = 1200;
    const tick = (t: number) => {
      const p = Math.min(1, (t - start) / dur);
      setN(Math.floor(to * (1 - Math.pow(1 - p, 3))));
      if (p < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [to]);
  return <span>{n.toLocaleString("ar-SA")}{suffix}</span>;
}

function timeAgo(iso: string) {
  const diff = Date.now() - new Date(iso).getTime();
  const h = Math.floor(diff / 3_600_000);
  if (h < 1) return "قبل قليل";
  if (h < 24) return `قبل ${h} ساعة`;
  const d = Math.floor(h / 24);
  return `قبل ${d} يوم`;
}

async function countOf(
  table: "profiles" | "services" | "projects" | "orders",
  apply?: (q: any) => any,
) {
  let q = supabase.from(table).select("id", { count: "exact", head: true });
  if (apply) q = apply(q);
  const { count, error } = await q;
  if (error) return 0;
  return count ?? 0;
}

export function Landing() {
  const [mode, setMode] = useState<Mode>("services");
  const [animatedText, setAnimatedText] = useState(0);
  const [q, setQ] = useState("");
  const headlines = mode === "services"
    ? ["اعثر على الخدمة المثالية", "بباقات وأسعار واضحة", "ودفع محمي حتى التسليم"]
    : ["انشر مشروعك الآن", "واستقبل عروض المستقلين", "خلال دقائق معدودة"];

  useEffect(() => {
    const id = setInterval(() => setAnimatedText((i) => (i + 1) % headlines.length), 2800);
    return () => clearInterval(id);
  }, [headlines.length]);

  const statsQ = useQuery({
    queryKey: ["landing-stats"],
    queryFn: async () => ({
      sellers: await countOf("profiles", (x) => x.in("account_type", ["seller", "both"])),
      services: await countOf("services", (x) => x.eq("status", "active")),
      projects: await countOf("projects", (x) => x.eq("status", "open")),
      completed: await countOf("orders", (x) => x.eq("status", "completed")),
    }),
  });

  const categoriesQ = useQuery({
    queryKey: ["landing-categories"],
    queryFn: async () => {
      const { data: cats, error } = await supabase
        .from("categories")
        .select("id, name_ar, slug, icon")
        .order("sort_order", { ascending: true });
      if (error) throw error;
      const { data: svc } = await supabase
        .from("services")
        .select("category_id")
        .eq("status", "active");
      const counts = new Map<string, number>();
      (svc ?? []).forEach((s: { category_id: string | null }) => {
        if (s.category_id) counts.set(s.category_id, (counts.get(s.category_id) ?? 0) + 1);
      });
      return (cats ?? []).map((c) => ({ ...c, count: counts.get(c.id) ?? 0 }));
    },
  });

  const servicesQ = useQuery({
    queryKey: ["landing-services"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("services")
        .select("id, title, price, delivery_days, rating, reviews_count, is_quick, seller_id, profiles:seller_id(full_name, username, avatar_url, seller_level, is_verified)")
        .eq("status", "active")
        .order("rating", { ascending: false })
        .order("created_at", { ascending: false })
        .limit(6);
      if (error) throw error;
      return data ?? [];
    },
  });

  const projectsQ = useQuery({
    queryKey: ["landing-projects"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("projects")
        .select("id, title, budget_min, budget_max, skills_required, proposals_count, created_at")
        .eq("status", "open")
        .order("created_at", { ascending: false })
        .limit(4);
      if (error) throw error;
      return data ?? [];
    },
  });

  const sellersQ = useQuery({
    queryKey: ["landing-sellers"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("profiles")
        .select("id, full_name, username, avatar_url, bio, rating, reviews_count, seller_level")
        .in("account_type", ["seller", "both"])
        .order("rating", { ascending: false })
        .order("reviews_count", { ascending: false })
        .limit(4);
      if (error) throw error;
      return data ?? [];
    },
  });

  const stats = statsQ.data;

  return (
    <div className="min-h-screen bg-background">
      <Header mode={mode} onModeChange={setMode} />

      {/* HERO */}
      <section className="relative overflow-hidden bg-gradient-hero text-primary-foreground">
        <div className="pointer-events-none absolute inset-0">
          <div className="absolute -top-32 -right-32 h-96 w-96 rounded-full bg-accent/20 blur-3xl" />
          <div className="absolute -bottom-32 -left-32 h-96 w-96 rounded-full bg-accent/10 blur-3xl" />
          <div className="absolute left-1/3 top-1/2 h-64 w-64 rounded-full bg-primary-glow/30 blur-3xl" />
        </div>
        <div className="container relative mx-auto px-4 py-20 lg:px-6 lg:py-28">
          <div className="grid items-center gap-12 lg:grid-cols-2">
            <div>
              <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/5 px-4 py-1.5 text-sm backdrop-blur">
                <Sparkles className="h-4 w-4 text-accent" />
                <span>منصة عربية للخدمات المستقلة</span>
              </div>
              <h1 className="mb-6 text-4xl font-extrabold leading-[1.15] tracking-tight md:text-6xl">
                <span className="block min-h-[1.3em] transition-all duration-500" key={animatedText}>
                  <span className="bg-gradient-to-l from-accent to-amber-300 bg-clip-text text-transparent">
                    {headlines[animatedText]}
                  </span>
                </span>
                <span className="mt-2 block text-white/90">على منصة سرعات</span>
              </h1>
              <p className="mb-8 max-w-xl text-lg text-white/70">
                منصة واحدة تجمع الخدمات الجاهزة والمشاريع المخصصة. اشترِ خدمة بسعر ثابت، أو انشر مشروعك واستقبل عروض المستقلين العرب.
              </p>

              {/* Mode toggle */}
              <div className="mb-5 inline-flex rounded-2xl border border-white/10 bg-white/5 p-1.5 backdrop-blur">
                <button
                  onClick={() => setMode("services")}
                  className={cn(
                    "rounded-xl px-6 py-2.5 text-sm font-bold transition-all",
                    mode === "services" ? "bg-accent text-accent-foreground shadow-glow" : "text-white/70 hover:text-white",
                  )}
                >
                  أبحث عن خدمة
                </button>
                <button
                  onClick={() => setMode("projects")}
                  className={cn(
                    "rounded-xl px-6 py-2.5 text-sm font-bold transition-all",
                    mode === "projects" ? "bg-accent text-accent-foreground shadow-glow" : "text-white/70 hover:text-white",
                  )}
                >
                  لدي مشروع
                </button>
              </div>

              {/* Search bar */}
              <div className="flex flex-col gap-3 rounded-2xl bg-white/95 p-2 shadow-elevated sm:flex-row">
                <div className="relative flex-1">
                  <Search className="pointer-events-none absolute right-4 top-1/2 h-5 w-5 -translate-y-1/2 text-muted-foreground" />
                  <input
                    value={q}
                    onChange={(e) => setQ(e.target.value)}
                    type="search"
                    placeholder={mode === "services" ? "جرّب: تصميم شعار، تطوير موقع، حملة إعلانية..." : "جرّب: متجر إلكتروني، تطبيق جوال..."}
                    className="h-12 w-full rounded-xl border-0 bg-transparent pr-12 pl-4 text-base text-foreground outline-none placeholder:text-muted-foreground"
                  />
                </div>
                <Link to="/services" search={{ q: q || undefined, category: undefined }}>
                  <Button variant="hero" size="xl" className="rounded-xl w-full">
                    بحث
                    <ArrowLeft className="h-4 w-4" />
                  </Button>
                </Link>
              </div>

              <div className="mt-5 flex flex-wrap items-center gap-x-5 gap-y-2 text-sm text-white/70">
                <span className="font-semibold text-white/90">تصفّح:</span>
                {(categoriesQ.data ?? []).slice(0, 4).map((c) => (
                  <Link key={c.slug} to="/services" search={{ q: undefined, category: c.slug }} className="rounded-full border border-white/15 px-3 py-1 hover:border-accent hover:text-accent">{c.name_ar}</Link>
                ))}
              </div>
            </div>

            {/* Illustrative platform preview (generic UI, not real people) */}
            <div className="relative hidden h-[480px] lg:block">
              <div className="absolute right-0 top-6 w-80 rounded-2xl border border-white/10 bg-white/95 p-5 text-foreground shadow-elevated">
                <div className="mb-4 flex items-center gap-2 text-sm font-bold text-primary">
                  <LayoutGrid className="h-4 w-4 text-accent" /> لوحة الخدمات
                </div>
                <div className="space-y-3">
                  {[0, 1, 2].map((i) => (
                    <div key={i} className="flex items-center gap-3 rounded-xl border border-border p-3">
                      <div className="h-9 w-9 shrink-0 rounded-lg bg-gradient-accent/80" />
                      <div className="flex-1 space-y-1.5">
                        <div className="h-2.5 w-3/4 rounded-full bg-muted" />
                        <div className="h-2 w-1/2 rounded-full bg-muted/70" />
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div className="absolute right-20 top-64 w-72 rounded-2xl bg-gradient-accent p-5 text-accent-foreground shadow-glow">
                <div className="mb-2 flex items-center gap-2 text-xs font-semibold opacity-90">
                  <MessagesSquare className="h-4 w-4" /> عروض المستقلين
                </div>
                <div className="mb-3 font-bold leading-snug">قارن العروض واختر الأنسب لمشروعك</div>
                <div className="h-2 w-2/3 rounded-full bg-white/40" />
              </div>

              <div className="absolute left-0 bottom-6 w-64 rounded-2xl border border-white/10 bg-white/95 p-4 text-foreground shadow-elevated">
                <div className="flex items-center gap-3">
                  <ShieldCheck className="h-9 w-9 text-success" />
                  <div>
                    <div className="text-sm font-bold">دفع محمي</div>
                    <div className="text-xs text-muted-foreground">لا تُحرَّر المبالغ قبل التسليم</div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* STATS — real numbers */}
      <section className="border-b border-border bg-card">
        <div className="container mx-auto grid grid-cols-2 gap-6 px-4 py-12 md:grid-cols-4 lg:px-6">
          {[
            { value: stats?.sellers ?? 0, label: "مستقل مسجّل", icon: Users },
            { value: stats?.services ?? 0, label: "خدمة منشورة", icon: Briefcase },
            { value: stats?.projects ?? 0, label: "مشروع مفتوح", icon: TrendingUp },
            { value: stats?.completed ?? 0, label: "طلب مكتمل", icon: CheckCircle2 },
          ].map((s) => (
            <div key={s.label} className="text-center">
              <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-xl bg-accent-soft">
                <s.icon className="h-6 w-6 text-accent" />
              </div>
              <div className="text-3xl font-extrabold text-primary md:text-4xl">
                {statsQ.isLoading ? <span className="text-muted-foreground">—</span> : <Counter to={s.value} />}
              </div>
              <div className="mt-1 text-sm text-muted-foreground">{s.label}</div>
            </div>
          ))}
        </div>
      </section>

      {/* CATEGORIES */}
      <section className="container mx-auto px-4 py-20 lg:px-6">
        <div className="mb-10 flex items-end justify-between">
          <div>
            <h2 className="mb-2 text-3xl font-extrabold text-primary md:text-4xl">تصفّح حسب التصنيف</h2>
            <p className="text-muted-foreground">تصنيفات تغطي مختلف مجالات العمل الحر</p>
          </div>
          <Link to="/services" search={{ q: undefined, category: undefined }} className="hidden items-center gap-1 text-sm font-bold text-accent hover:underline md:inline-flex">
            عرض الكل <ChevronLeft className="h-4 w-4" />
          </Link>
        </div>
        {categoriesQ.isLoading ? (
          <div className="py-10 text-center text-muted-foreground">جارٍ التحميل...</div>
        ) : (
          <div className="grid grid-cols-2 gap-4 md:grid-cols-3 lg:grid-cols-5">
            {(categoriesQ.data ?? []).map((c, i) => {
              const Icon = ICONS[c.icon ?? ""] ?? Briefcase;
              return (
                <Link key={c.id} to="/services" search={{ q: undefined, category: c.slug }} className={cn(
                  "group relative overflow-hidden rounded-2xl border border-border bg-gradient-to-br p-5 transition-all hover:-translate-y-1 hover:shadow-elevated",
                  CAT_COLORS[i % CAT_COLORS.length],
                )}>
                  <div className="mb-3 flex h-12 w-12 items-center justify-center rounded-xl bg-white shadow-soft transition-transform group-hover:scale-110">
                    <Icon className="h-6 w-6 text-primary" />
                  </div>
                  <div className="font-bold text-primary">{c.name_ar}</div>
                  <div className="mt-1 text-xs text-muted-foreground">
                    {c.count === 0 ? "لا توجد خدمات بعد" : `${c.count.toLocaleString("ar-SA")} خدمة`}
                  </div>
                </Link>
              );
            })}
          </div>
        )}
      </section>

      {/* HOW IT WORKS */}
      <section className="bg-card py-20">
        <div className="container mx-auto px-4 lg:px-6">
          <div className="mb-12 text-center">
            <h2 className="mb-3 text-3xl font-extrabold text-primary md:text-4xl">كيف تعمل سرعات؟</h2>
            <p className="mx-auto max-w-xl text-muted-foreground">
              {mode === "services" ? "ثلاث خطوات بسيطة للحصول على خدمتك" : "ثلاث خطوات لنشر مشروعك واستقبال العروض"}
            </p>
          </div>
          <div className="grid gap-6 md:grid-cols-3">
            {(mode === "services"
              ? [
                  { icon: Search, title: "1. ابحث واكتشف", text: "تصفّح الخدمات المنشورة على المنصة أو ابحث بالكلمة المفتاحية." },
                  { icon: Zap, title: "2. اطلب الخدمة", text: "اختر الباقة المناسبة، أرسل المتطلبات، وتابع التقدم لحظة بلحظة." },
                  { icon: CheckCircle2, title: "3. استلم وقيّم", text: "استلم العمل، اطلب تعديلات إن لزم، ثم قيّم المستقل لمساعدة الآخرين." },
                ]
              : [
                  { icon: PenTool, title: "1. انشر مشروعك", text: "اكتب وصفاً واضحاً، حدّد الميزانية والمدة، واختر المهارات المطلوبة." },
                  { icon: Users, title: "2. استقبل العروض", text: "يتقدم المستقلون بعروض مفصلة، قارن بينها وراجع ملفاتهم الشخصية." },
                  { icon: TrendingUp, title: "3. ابدأ وأنجز", text: "اختر المستقل المناسب، تابع المشروع عبر لوحة الإدارة، وادفع بأمان." },
                ]
            ).map((s) => (
              <div key={s.title} className="rounded-2xl border border-border bg-gradient-card p-7 shadow-soft transition hover:shadow-elevated">
                <div className="mb-5 flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-accent shadow-glow">
                  <s.icon className="h-7 w-7 text-accent-foreground" />
                </div>
                <h3 className="mb-2 text-xl font-bold text-primary">{s.title}</h3>
                <p className="text-muted-foreground leading-relaxed">{s.text}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* SERVICES */}
      <section className="container mx-auto px-4 py-20 lg:px-6">
        <div className="mb-10 flex items-end justify-between">
          <div>
            <h2 className="mb-2 text-3xl font-extrabold text-primary md:text-4xl">أحدث الخدمات</h2>
            <p className="text-muted-foreground">خدمات منشورة فعلياً على المنصة</p>
          </div>
          <Link to="/services" search={{ q: undefined, category: undefined }} className="hidden items-center gap-1 text-sm font-bold text-accent hover:underline md:inline-flex">
            عرض الكل <ChevronLeft className="h-4 w-4" />
          </Link>
        </div>
        {servicesQ.isLoading ? (
          <div className="py-16 text-center text-muted-foreground">جارٍ التحميل...</div>
        ) : (servicesQ.data ?? []).length === 0 ? (
          <div className="rounded-2xl border border-dashed border-border p-16 text-center">
            <div className="mb-2 text-lg font-bold text-primary">لا توجد خدمات منشورة بعد</div>
            <p className="mb-5 text-sm text-muted-foreground">المنصة في بدايتها — كن أول من ينشر خدمته.</p>
            <Link to="/services/create"><Button variant="hero">أضف خدمتك</Button></Link>
          </div>
        ) : (
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {(servicesQ.data ?? []).map((s: any) => {
              const seller = s.profiles ?? {};
              const name = seller.full_name ?? seller.username ?? "مستقل";
              return (
                <Link to="/services/$id" params={{ id: s.id }} key={s.id}>
                  <article className="group h-full overflow-hidden rounded-2xl border border-border bg-card shadow-soft transition hover:-translate-y-1 hover:shadow-elevated">
                    <div className="relative aspect-[16/10] overflow-hidden bg-gradient-to-br from-primary/90 to-primary-glow">
                      <div className="absolute inset-0 flex items-center justify-center text-6xl font-black text-white/10">سرعات</div>
                      {s.is_quick && (
                        <span className="absolute right-3 top-3 rounded-full bg-accent px-3 py-1 text-xs font-bold text-accent-foreground shadow-glow">
                          خدمة سريعة
                        </span>
                      )}
                    </div>
                    <div className="p-5">
                      <div className="mb-3 flex items-center gap-2.5">
                        <div className="flex h-9 w-9 items-center justify-center overflow-hidden rounded-full bg-gradient-accent text-sm font-bold text-accent-foreground">
                          {seller.avatar_url ? <img src={seller.avatar_url} alt={name} className="h-full w-full object-cover" /> : name[0]}
                        </div>
                        <div className="min-w-0">
                          <div className="truncate text-sm font-bold">{name}</div>
                          {seller.is_verified && <div className="text-xs text-muted-foreground">حساب موثّق ✓</div>}
                        </div>
                      </div>
                      <h3 className="mb-3 line-clamp-2 min-h-[3rem] font-semibold leading-snug text-foreground group-hover:text-accent">
                        {s.title}
                      </h3>
                      <div className="mb-4 flex items-center gap-1.5 text-sm">
                        {(s.reviews_count ?? 0) > 0 ? (
                          <>
                            <Star className="h-4 w-4 fill-accent text-accent" />
                            <span className="font-bold">{Number(s.rating ?? 0).toFixed(1)}</span>
                            <span className="text-muted-foreground">({s.reviews_count})</span>
                          </>
                        ) : (
                          <span className="text-muted-foreground">لا توجد تقييمات بعد</span>
                        )}
                        <span className="mx-2 text-muted-foreground">•</span>
                        <Clock className="h-3.5 w-3.5 text-muted-foreground" />
                        <span className="text-muted-foreground">{s.delivery_days} أيام</span>
                      </div>
                      <div className="flex items-end justify-between border-t border-border pt-4">
                        <div>
                          <div className="text-xs text-muted-foreground">يبدأ من</div>
                          <div className="text-2xl font-extrabold text-accent"><span className="text-sm">$</span>{Number(s.price).toLocaleString()}</div>
                        </div>
                        <Button variant="navy" size="sm">التفاصيل</Button>
                      </div>
                    </div>
                  </article>
                </Link>
              );
            })}
          </div>
        )}
      </section>

      {/* LATEST PROJECTS */}
      <section className="bg-card py-20">
        <div className="container mx-auto px-4 lg:px-6">
          <div className="mb-10 flex items-end justify-between">
            <div>
              <h2 className="mb-2 text-3xl font-extrabold text-primary md:text-4xl">أحدث المشاريع</h2>
              <p className="text-muted-foreground">مشاريع مفتوحة لاستقبال العروض</p>
            </div>
            <Link to="/projects">
              <Button variant="hero">انشر مشروعك</Button>
            </Link>
          </div>
          {projectsQ.isLoading ? (
            <div className="py-16 text-center text-muted-foreground">جارٍ التحميل...</div>
          ) : (projectsQ.data ?? []).length === 0 ? (
            <div className="rounded-2xl border border-dashed border-border p-16 text-center">
              <div className="mb-2 text-lg font-bold text-primary">لا توجد مشاريع مفتوحة حالياً</div>
              <p className="text-sm text-muted-foreground">انشر أول مشروع واستقبل عروض المستقلين.</p>
            </div>
          ) : (
            <div className="grid gap-4 md:grid-cols-2">
              {(projectsQ.data ?? []).map((p: any) => (
                <Link to="/projects/$id" params={{ id: p.id }} key={p.id}>
                  <article className="h-full rounded-2xl border border-border bg-background p-6 shadow-soft transition hover:border-accent/40 hover:shadow-elevated">
                    <div className="mb-3 flex items-start justify-between gap-3">
                      <h3 className="text-lg font-bold leading-snug text-primary">{p.title}</h3>
                      <span className="shrink-0 rounded-full bg-success/10 px-3 py-1 text-xs font-bold text-success">مفتوح</span>
                    </div>
                    {(p.skills_required as string[] | null)?.length ? (
                      <div className="mb-4 flex flex-wrap gap-2">
                        {(p.skills_required as string[]).slice(0, 4).map((s) => (
                          <span key={s} className="rounded-full bg-muted px-3 py-1 text-xs font-semibold text-foreground/70">{s}</span>
                        ))}
                      </div>
                    ) : null}
                    <div className="flex items-center justify-between border-t border-border pt-4 text-sm">
                      <div>
                        <div className="text-xs text-muted-foreground">الميزانية</div>
                        <div className="font-extrabold text-accent">
                          ${Number(p.budget_min).toLocaleString()} - ${Number(p.budget_max).toLocaleString()}
                        </div>
                      </div>
                      <div className="flex items-center gap-4 text-muted-foreground">
                        <span className="flex items-center gap-1"><Users className="h-3.5 w-3.5" /> {p.proposals_count ?? 0} عرض</span>
                        <span>{timeAgo(p.created_at)}</span>
                      </div>
                    </div>
                  </article>
                </Link>
              ))}
            </div>
          )}
        </div>
      </section>

      {/* SELLERS */}
      <section className="container mx-auto px-4 py-20 lg:px-6">
        <div className="mb-10 text-center">
          <h2 className="mb-3 text-3xl font-extrabold text-primary md:text-4xl">مستقلون على المنصة</h2>
          <p className="text-muted-foreground">تعرّف على المستقلين المسجّلين في سرعات</p>
        </div>
        {sellersQ.isLoading ? (
          <div className="py-16 text-center text-muted-foreground">جارٍ التحميل...</div>
        ) : (sellersQ.data ?? []).length === 0 ? (
          <div className="rounded-2xl border border-dashed border-border p-16 text-center">
            <div className="mb-2 text-lg font-bold text-primary">لا يوجد مستقلون مسجّلون بعد</div>
            <p className="mb-5 text-sm text-muted-foreground">سجّل كمستقل وكن من أوائل المنضمين.</p>
            <Link to="/auth"><Button variant="hero">سجّل كمستقل</Button></Link>
          </div>
        ) : (
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
            {(sellersQ.data ?? []).map((f: any) => {
              const name = f.full_name ?? f.username ?? "مستقل";
              return (
                <Link to="/profile/$userId" params={{ userId: f.id }} key={f.id}>
                  <div className="group h-full rounded-2xl border border-border bg-card p-6 text-center shadow-soft transition hover:-translate-y-1 hover:shadow-elevated">
                    <div className="relative mx-auto mb-4 h-20 w-20">
                      <div className="flex h-20 w-20 items-center justify-center overflow-hidden rounded-full bg-gradient-accent text-2xl font-extrabold text-accent-foreground shadow-glow">
                        {f.avatar_url ? <img src={f.avatar_url} alt={name} className="h-full w-full object-cover" /> : name[0]}
                      </div>
                    </div>
                    <div className="mb-1 font-bold text-primary">{name}</div>
                    <div className="mb-3 line-clamp-2 min-h-[2rem] text-xs text-muted-foreground">{f.bio ?? "لا توجد نبذة"}</div>
                    <div className="flex items-center justify-center gap-3 border-t border-border pt-3 text-sm">
                      {(f.reviews_count ?? 0) > 0 ? (
                        <>
                          <span className="flex items-center gap-1"><Star className="h-3.5 w-3.5 fill-accent text-accent" /> {Number(f.rating ?? 0).toFixed(1)}</span>
                          <span className="text-muted-foreground">•</span>
                          <span className="text-muted-foreground">{f.reviews_count} تقييم</span>
                        </>
                      ) : (
                        <span className="text-muted-foreground">عضو جديد</span>
                      )}
                    </div>
                  </div>
                </Link>
              );
            })}
          </div>
        )}
      </section>

      {/* WHY US */}
      <section className="bg-gradient-hero py-20 text-primary-foreground">
        <div className="container mx-auto px-4 lg:px-6">
          <div className="mb-12 text-center">
            <h2 className="mb-3 text-3xl font-extrabold md:text-4xl">لماذا سرعات؟</h2>
            <p className="mx-auto max-w-xl text-white/70">ميزات مصممة لتجربة عمل حر استثنائية</p>
          </div>
          <div className="grid gap-6 md:grid-cols-3">
            {[
              { icon: Shield, title: "حماية الدفع", text: "الدفع يتم عبر بوابة آمنة ولا يُحرَّر للمستقل قبل التسليم." },
              { icon: MessagesSquare, title: "محادثات مباشرة", text: "تواصل فوري بين المشتري والمستقل داخل المنصة." },
              { icon: Zap, title: "خدمات سريعة", text: "قسم مخصص للخدمات التي تُسلَّم خلال 24 ساعة فقط." },
            ].map((f) => (
              <div key={f.title} className="rounded-2xl border border-white/10 bg-white/5 p-7 backdrop-blur">
                <div className="mb-5 flex h-12 w-12 items-center justify-center rounded-xl bg-accent shadow-glow">
                  <f.icon className="h-6 w-6 text-accent-foreground" />
                </div>
                <h3 className="mb-2 text-xl font-bold">{f.title}</h3>
                <p className="text-white/70 leading-relaxed">{f.text}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="container mx-auto px-4 py-20 lg:px-6">
        <div className="relative overflow-hidden rounded-3xl bg-gradient-hero p-10 text-center text-primary-foreground shadow-elevated md:p-16">
          <div className="pointer-events-none absolute -top-20 -right-20 h-80 w-80 rounded-full bg-accent/30 blur-3xl" />
          <div className="pointer-events-none absolute -bottom-20 -left-20 h-80 w-80 rounded-full bg-accent/20 blur-3xl" />
          <div className="relative">
            <h2 className="mb-4 text-3xl font-extrabold md:text-5xl">ابدأ رحلتك مع سرعات اليوم</h2>
            <p className="mx-auto mb-8 max-w-2xl text-lg text-white/80">
              انضم إلى المنصة كمستقل أو كصاحب عمل، وابدأ أول تعاون لك.
            </p>
            <div className="flex flex-wrap items-center justify-center gap-3">
              <Link to="/auth"><Button variant="hero" size="xl">سجّل كمستقل</Button></Link>
              <Link to="/projects"><Button variant="heroOutline" size="xl">انشر مشروعاً</Button></Link>
            </div>
          </div>
        </div>
      </section>

      <Footer />
    </div>
  );
}
