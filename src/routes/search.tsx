import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { z } from "zod";
import { Search as SearchIcon, Star, Clock } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { PageShell } from "@/components/site/PageShell";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";

const searchSchema = z.object({
  q: z.string().optional(),
  category: z.string().optional(),
  min: z.number().optional(),
  max: z.number().optional(),
  rating: z.number().optional(),
  tab: z.string().optional(),
});

export const Route = createFileRoute("/search")({
  validateSearch: searchSchema,
  head: () => ({
    meta: [
      { title: "البحث — سرعات" },
      { name: "description", content: "ابحث في آلاف الخدمات والمشاريع على منصة سرعات مع فلاتر الفئة والسعر والتقييم." },
      { property: "og:title", content: "البحث — سرعات" },
      { property: "og:description", content: "ابحث في الخدمات والمشاريع وفلترها حسب الفئة والسعر والتقييم." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: SearchPage,
  errorComponent: ({ error }) => <div className="p-10 text-center text-sm text-muted-foreground">{error.message}</div>,
  notFoundComponent: () => <div className="p-10 text-center">غير موجود</div>,
});

function escapeTerm(v: string) {
  return v.replace(/[,()*:\\]/g, " ").replace(/%/g, "\\%").replace(/_/g, "\\_").trim();
}

function SearchPage() {
  const search = Route.useSearch();
  const navigate = Route.useNavigate();
  const [draft, setDraft] = useState(search.q ?? "");
  const tab = search.tab === "projects" ? "projects" : "services";
  const term = escapeTerm(search.q ?? "");

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
    queryKey: ["search-services", term, catId, search.min, search.max, search.rating],
    enabled: tab === "services",
    queryFn: async () => {
      let q = supabase
        .from("services")
        .select("id, title, description, price, delivery_days, rating, reviews_count")
        .eq("status", "active");
      if (term) q = q.or(`title.ilike.%${term}%,description.ilike.%${term}%`);
      if (catId) q = q.eq("category_id", catId);
      if (search.min != null) q = q.gte("price", search.min);
      if (search.max != null) q = q.lte("price", search.max);
      if (search.rating != null) q = q.gte("rating", search.rating);
      const { data, error } = await q.order("created_at", { ascending: false }).limit(40);
      if (error) throw error;
      return data ?? [];
    },
  });

  const projectsQ = useQuery({
    queryKey: ["search-projects", term, catId, search.min, search.max],
    enabled: tab === "projects",
    queryFn: async () => {
      let q = supabase
        .from("projects")
        .select("id, title, description, budget_min, budget_max, deadline_days, proposals_count")
        .eq("status", "open");
      if (term) q = q.or(`title.ilike.%${term}%,description.ilike.%${term}%`);
      if (catId) q = q.eq("category_id", catId);
      if (search.min != null) q = q.gte("budget_min", search.min);
      if (search.max != null) q = q.lte("budget_max", search.max);
      const { data, error } = await q.order("created_at", { ascending: false }).limit(40);
      if (error) throw error;
      return data ?? [];
    },
  });

  const setParam = (patch: Record<string, unknown>) =>
    navigate({ search: (prev) => ({ ...prev, ...patch }) });

  return (
    <PageShell>
      <section className="border-b border-border bg-gradient-to-br from-primary to-primary/90 py-12 text-primary-foreground">
        <div className="container mx-auto px-4 lg:px-6">
          <h1 className="mb-6 text-center text-3xl font-extrabold md:text-4xl">ابحث في سرعات</h1>
          <form
            onSubmit={(e) => {
              e.preventDefault();
              setParam({ q: draft || undefined });
            }}
            className="mx-auto flex max-w-2xl gap-2"
          >
            <div className="relative flex-1">
              <SearchIcon className="absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                value={draft}
                onChange={(e) => setDraft(e.target.value)}
                placeholder="ابحث عن خدمة أو مشروع..."
                className="h-12 bg-card pr-9 text-foreground"
              />
            </div>
            <Button type="submit" variant="hero" size="lg">بحث</Button>
          </form>
        </div>
      </section>

      <div className="container mx-auto grid gap-8 px-4 py-10 lg:grid-cols-4 lg:px-6">
        <aside className="space-y-6">
          <Card className="p-5">
            <h2 className="mb-3 font-bold">الفئة</h2>
            <div className="space-y-1 text-sm">
              <button className={`block w-full rounded-lg px-3 py-2 text-right ${!search.category ? "bg-accent/10 text-accent" : "hover:bg-muted"}`} onClick={() => setParam({ category: undefined })}>
                كل الفئات
              </button>
              {catsQ.data?.map((c) => (
                <button
                  key={c.id}
                  onClick={() => setParam({ category: c.slug })}
                  className={`block w-full rounded-lg px-3 py-2 text-right ${search.category === c.slug ? "bg-accent/10 text-accent" : "hover:bg-muted"}`}
                >
                  {c.name_ar}
                </button>
              ))}
            </div>
          </Card>
          <Card className="p-5">
            <h2 className="mb-3 font-bold">السعر (USD)</h2>
            <div className="flex gap-2">
              <Input type="number" placeholder="من" value={search.min ?? ""} onChange={(e) => setParam({ min: e.target.value ? Number(e.target.value) : undefined })} />
              <Input type="number" placeholder="إلى" value={search.max ?? ""} onChange={(e) => setParam({ max: e.target.value ? Number(e.target.value) : undefined })} />
            </div>
          </Card>
          {tab === "services" && (
            <Card className="p-5">
              <h2 className="mb-3 font-bold">التقييم</h2>
              <div className="space-y-1 text-sm">
                {[undefined, 4, 4.5].map((r) => (
                  <button
                    key={String(r)}
                    onClick={() => setParam({ rating: r })}
                    className={`block w-full rounded-lg px-3 py-2 text-right ${search.rating === r ? "bg-accent/10 text-accent" : "hover:bg-muted"}`}
                  >
                    {r ? `${r} نجوم فأعلى` : "كل التقييمات"}
                  </button>
                ))}
              </div>
            </Card>
          )}
        </aside>

        <div className="lg:col-span-3">
          <Tabs value={tab} onValueChange={(v) => setParam({ tab: v })} className="mb-6">
            <TabsList>
              <TabsTrigger value="services">الخدمات</TabsTrigger>
              <TabsTrigger value="projects">المشاريع</TabsTrigger>
            </TabsList>
          </Tabs>

          {tab === "services" ? (
            servicesQ.isLoading ? (
              <p className="text-muted-foreground">جارٍ البحث...</p>
            ) : servicesQ.data?.length ? (
              <div className="grid gap-4 sm:grid-cols-2">
                {servicesQ.data.map((s) => (
                  <Link key={s.id} to="/services/$id" params={{ id: s.id }}>
                    <Card className="h-full p-5 transition hover:shadow-soft">
                      <h3 className="line-clamp-2 font-bold">{s.title}</h3>
                      <p className="mt-2 line-clamp-2 text-sm text-muted-foreground">{s.description}</p>
                      <div className="mt-4 flex items-center justify-between text-sm">
                        <span className="flex items-center gap-1 text-muted-foreground">
                          <Star className="h-4 w-4 fill-accent text-accent" /> {(s.rating ?? 0).toFixed(1)} ({s.reviews_count ?? 0})
                        </span>
                        <span className="font-bold">${s.price}</span>
                      </div>
                    </Card>
                  </Link>
                ))}
              </div>
            ) : (
              <p className="text-muted-foreground">لا توجد نتائج مطابقة</p>
            )
          ) : projectsQ.isLoading ? (
            <p className="text-muted-foreground">جارٍ البحث...</p>
          ) : projectsQ.data?.length ? (
            <div className="space-y-4">
              {projectsQ.data.map((p) => (
                <Link key={p.id} to="/projects/$id" params={{ id: p.id }}>
                  <Card className="p-5 transition hover:shadow-soft">
                    <h3 className="font-bold">{p.title}</h3>
                    <p className="mt-2 line-clamp-2 text-sm text-muted-foreground">{p.description}</p>
                    <div className="mt-4 flex flex-wrap items-center gap-3 text-sm text-muted-foreground">
                      <Badge variant="secondary">${p.budget_min} - ${p.budget_max}</Badge>
                      <span className="flex items-center gap-1"><Clock className="h-4 w-4" /> {p.deadline_days} يوم</span>
                      <span>{p.proposals_count ?? 0} عرض</span>
                    </div>
                  </Card>
                </Link>
              ))}
            </div>
          ) : (
            <p className="text-muted-foreground">لا توجد نتائج مطابقة</p>
          )}
        </div>
      </div>
    </PageShell>
  );
}