import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { z } from "zod";
import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Header, type Mode } from "@/components/site/Header";
import { Footer } from "@/components/site/Footer";
import { Star, Clock, Search, SlidersHorizontal } from "lucide-react";
import { cn } from "@/lib/utils";

type SearchParams = {
  q?: string;
  category?: string;
  sort?: "newest" | "price_asc" | "price_desc" | "rating";
  min?: number;
  max?: number;
};

const searchSchema = z.object({
  q: z.string().optional(),
  category: z.string().optional(),
  sort: z.enum(["newest", "price_asc", "price_desc", "rating"]).optional(),
  min: z.number().optional(),
  max: z.number().optional(),
});

export const Route = createFileRoute("/services")({
  validateSearch: searchSchema,
  head: () => ({
    meta: [
      { title: "الخدمات — سرعات" },
      { name: "description", content: "تصفّح آلاف الخدمات من أفضل المستقلين العرب على منصة سرعات." },
    ],
  }),
  component: ServicesPage,
  errorComponent: ({ error }) => (
    <div className="p-8 text-center text-sm text-muted-foreground">{error.message}</div>
  ),
  notFoundComponent: () => <div className="p-8 text-center">غير موجود</div>,
});

type Row = {
  id: string;
  title: string;
  description: string | null;
  price: number;
  delivery_days: number;
  rating: number | null;
  reviews_count: number | null;
  orders_count: number | null;
  gallery_images: string[] | null;
  category_id: string | null;
  seller_id: string;
  is_quick: boolean | null;
};

function ServicesPage() {
  const search = Route.useSearch();
  const navigate = Route.useNavigate();
  const [mode, setMode] = useState<Mode>("services");
  const [qDraft, setQDraft] = useState(search.q ?? "");

  const catsQ = useQuery({
    queryKey: ["categories"],
    queryFn: async () => {
      const { data, error } = await supabase.from("categories").select("id, slug, name_ar").order("sort_order");
      if (error) throw error;
      return data ?? [];
    },
  });

  const catId = catsQ.data?.find((c) => c.slug === search.category)?.id;

  const servicesQ = useQuery({
    queryKey: ["services", search.q ?? "", search.category ?? "", search.sort ?? "newest", search.min ?? 0, search.max ?? 0],
    enabled: !search.category || !!catId,
    queryFn: async () => {
      let q = supabase.from("services").select("*").eq("status", "active");
      if (catId) q = q.eq("category_id", catId);
      if (search.q) q = q.ilike("title", `%${search.q}%`);
      if (search.min) q = q.gte("price", search.min);
      if (search.max) q = q.lte("price", search.max);
      switch (search.sort) {
        case "price_asc": q = q.order("price", { ascending: true }); break;
        case "price_desc": q = q.order("price", { ascending: false }); break;
        case "rating": q = q.order("rating", { ascending: false, nullsFirst: false }); break;
        default: q = q.order("created_at", { ascending: false });
      }
      const { data, error } = await q.limit(60);
      if (error) throw error;
      return (data ?? []) as Row[];
    },
  });

  const activeCat = catsQ.data?.find((c) => c.slug === search.category);

  return (
    <div className="min-h-screen bg-background">
      <Header mode={mode} onModeChange={setMode} />
      <section className="bg-gradient-hero py-10 text-primary-foreground">
        <div className="container mx-auto px-4 lg:px-6">
          <h1 className="mb-2 text-3xl font-extrabold md:text-4xl">
            {activeCat ? activeCat.name_ar : "جميع الخدمات"}
          </h1>
          <p className="mb-6 text-white/70">اعثر على الخدمة المثالية بأفضل سعر وأسرع تسليم.</p>
          <form
            onSubmit={(e) => {
              e.preventDefault();
              navigate({ search: (prev: SearchParams) => ({ ...prev, q: qDraft || undefined }) });
            }}
            className="flex gap-2 rounded-2xl bg-white/95 p-2 shadow-elevated"
          >
            <div className="relative flex-1">
              <Search className="pointer-events-none absolute right-4 top-1/2 h-5 w-5 -translate-y-1/2 text-muted-foreground" />
              <input
                value={qDraft}
                onChange={(e) => setQDraft(e.target.value)}
                type="search"
                placeholder="ابحث في الخدمات..."
                className="h-11 w-full rounded-xl border-0 bg-transparent pr-12 pl-4 text-base text-foreground outline-none"
              />
            </div>
            <button className="rounded-xl bg-accent px-6 py-2 text-sm font-bold text-accent-foreground">بحث</button>
          </form>
        </div>
      </section>

      <section className="container mx-auto grid gap-6 px-4 py-10 lg:grid-cols-[240px_1fr] lg:px-6">
        {/* Sidebar */}
        <aside className="space-y-6 rounded-2xl border border-border bg-card p-5 lg:sticky lg:top-20 lg:self-start">
          <div>
            <div className="mb-3 flex items-center gap-2 text-sm font-bold text-primary">
              <SlidersHorizontal className="h-4 w-4" /> التصنيف
            </div>
            <div className="flex flex-col gap-1 text-sm">
              <Link to="/services" search={{ ...search, category: undefined }} className={cn("rounded-md px-2 py-1.5 hover:bg-muted", !search.category && "bg-muted font-bold")}>
                الكل
              </Link>
              {(catsQ.data ?? []).map((c) => (
                <Link key={c.id} to="/services" search={{ ...search, category: c.slug }} className={cn("rounded-md px-2 py-1.5 hover:bg-muted", search.category === c.slug && "bg-muted font-bold")}>
                  {c.name_ar}
                </Link>
              ))}
            </div>
          </div>
          <div>
            <div className="mb-2 text-sm font-bold text-primary">السعر (USD)</div>
            <div className="flex gap-2">
              <input
                type="number"
                placeholder="من"
                defaultValue={search.min ?? ""}
                onBlur={(e) => navigate({ search: (p: SearchParams) => ({ ...p, min: e.target.value ? Number(e.target.value) : undefined }) })}
                className="h-9 w-full rounded-md border border-input bg-background px-2 text-sm"
              />
              <input
                type="number"
                placeholder="إلى"
                defaultValue={search.max ?? ""}
                onBlur={(e) => navigate({ search: (p: SearchParams) => ({ ...p, max: e.target.value ? Number(e.target.value) : undefined }) })}
                className="h-9 w-full rounded-md border border-input bg-background px-2 text-sm"
              />
            </div>
          </div>
          <div>
            <div className="mb-2 text-sm font-bold text-primary">الترتيب</div>
            <select
              value={search.sort ?? "newest"}
              onChange={(e) => navigate({ search: (p: SearchParams) => ({ ...p, sort: e.target.value as SearchParams["sort"] }) })}
              className="h-9 w-full rounded-md border border-input bg-background px-2 text-sm"
            >
              <option value="newest">الأحدث</option>
              <option value="price_asc">السعر: الأقل</option>
              <option value="price_desc">السعر: الأعلى</option>
              <option value="rating">الأعلى تقييماً</option>
            </select>
          </div>
        </aside>

        {/* Grid */}
        <div>
          {servicesQ.isLoading ? (
            <div className="py-20 text-center text-muted-foreground">جارٍ التحميل...</div>
          ) : (servicesQ.data ?? []).length === 0 ? (
            <div className="rounded-2xl border border-dashed border-border p-16 text-center">
              <div className="mb-2 text-lg font-bold text-primary">لا توجد خدمات مطابقة</div>
              <p className="text-sm text-muted-foreground">جرّب تعديل الفلاتر أو البحث بكلمات أخرى.</p>
            </div>
          ) : (
            <div className="grid gap-5 sm:grid-cols-2 xl:grid-cols-3">
              {(servicesQ.data ?? []).map((s) => (
                <ServiceCard key={s.id} s={s} />
              ))}
            </div>
          )}
        </div>
      </section>
      <Footer />
    </div>
  );
}

function ServiceCard({ s }: { s: Row }) {
  const cover = s.gallery_images?.[0];
  return (
    <Link to="/services/$id" params={{ id: s.id }}>
      <article className="group h-full overflow-hidden rounded-2xl border border-border bg-card shadow-soft transition hover:-translate-y-1 hover:shadow-elevated">
        <div className="relative aspect-[16/10] overflow-hidden bg-gradient-to-br from-primary/90 to-primary-glow">
          {cover ? (
            <img src={cover} alt={s.title} className="h-full w-full object-cover" loading="lazy" />
          ) : (
            <div className="absolute inset-0 flex items-center justify-center text-5xl font-black text-white/10">سرعات</div>
          )}
          {s.is_quick && (
            <span className="absolute right-3 top-3 rounded-full bg-accent px-3 py-1 text-xs font-bold text-accent-foreground shadow-glow">
              خدمة سريعة
            </span>
          )}
        </div>
        <div className="p-5">
          <h3 className="mb-3 line-clamp-2 min-h-[3rem] font-semibold leading-snug text-foreground group-hover:text-accent">
            {s.title}
          </h3>
          <div className="mb-4 flex items-center gap-1.5 text-sm">
            <Star className="h-4 w-4 fill-accent text-accent" />
            <span className="font-bold">{s.rating?.toFixed(1) ?? "جديد"}</span>
            {s.reviews_count ? <span className="text-muted-foreground">({s.reviews_count})</span> : null}
            <span className="mx-2 text-muted-foreground">•</span>
            <Clock className="h-3.5 w-3.5 text-muted-foreground" />
            <span className="text-muted-foreground">{s.delivery_days} يوم</span>
          </div>
          <div className="flex items-end justify-between border-t border-border pt-4">
            <div>
              <div className="text-xs text-muted-foreground">يبدأ من</div>
              <div className="text-2xl font-extrabold text-accent">
                <span className="text-sm">$</span>{Number(s.price).toLocaleString("en-US")}
              </div>
            </div>
          </div>
        </div>
      </article>
    </Link>
  );
}