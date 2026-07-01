import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Header, type Mode } from "@/components/site/Header";
import { Footer } from "@/components/site/Footer";
import { Button } from "@/components/ui/button";
import { Users, Search } from "lucide-react";

export const Route = createFileRoute("/projects")({
  head: () => ({
    meta: [
      { title: "المشاريع — سرعات" },
      { name: "description", content: "تصفّح أحدث المشاريع المفتوحة على منصة سرعات وقدّم عرضك." },
    ],
  }),
  component: ProjectsPage,
  errorComponent: ({ error }) => (
    <div className="p-8 text-center text-sm text-muted-foreground">{error.message}</div>
  ),
  notFoundComponent: () => <div className="p-8 text-center">غير موجود</div>,
});

function ProjectsPage() {
  const [mode, setMode] = useState<Mode>("projects");
  const [q, setQ] = useState("");
  const [applied, setApplied] = useState("");

  const { data, isLoading } = useQuery({
    queryKey: ["projects", applied],
    queryFn: async () => {
      let qb = supabase.from("projects").select("*, categories(name_ar, slug)").eq("status", "open").order("created_at", { ascending: false });
      if (applied) qb = qb.ilike("title", `%${applied}%`);
      const { data, error } = await qb.limit(60);
      if (error) throw error;
      return data ?? [];
    },
  });

  return (
    <div className="min-h-screen bg-background">
      <Header mode={mode} onModeChange={setMode} />
      <section className="bg-gradient-hero py-10 text-primary-foreground">
        <div className="container mx-auto px-4 lg:px-6">
          <div className="mb-6 flex flex-wrap items-center justify-between gap-4">
            <div>
              <h1 className="text-3xl font-extrabold md:text-4xl">المشاريع المفتوحة</h1>
              <p className="mt-2 text-white/70">قدّم عروضك على مشاريع من عملاء موثوقين.</p>
            </div>
            <Link to="/auth"><Button variant="hero" size="lg">انشر مشروعك</Button></Link>
          </div>
          <form
            onSubmit={(e) => { e.preventDefault(); setApplied(q); }}
            className="flex gap-2 rounded-2xl bg-white/95 p-2 shadow-elevated"
          >
            <div className="relative flex-1">
              <Search className="pointer-events-none absolute right-4 top-1/2 h-5 w-5 -translate-y-1/2 text-muted-foreground" />
              <input
                value={q} onChange={(e) => setQ(e.target.value)}
                type="search" placeholder="ابحث في المشاريع..."
                className="h-11 w-full rounded-xl border-0 bg-transparent pr-12 pl-4 text-base text-foreground outline-none"
              />
            </div>
            <button className="rounded-xl bg-accent px-6 py-2 text-sm font-bold text-accent-foreground">بحث</button>
          </form>
        </div>
      </section>

      <section className="container mx-auto px-4 py-10 lg:px-6">
        {isLoading ? (
          <div className="py-20 text-center text-muted-foreground">جارٍ التحميل...</div>
        ) : (data ?? []).length === 0 ? (
          <div className="rounded-2xl border border-dashed border-border p-16 text-center">
            <div className="mb-2 text-lg font-bold text-primary">لا توجد مشاريع مطابقة</div>
            <p className="text-sm text-muted-foreground">كن أول من ينشر مشروعاً!</p>
          </div>
        ) : (
          <div className="grid gap-4 md:grid-cols-2">
            {(data ?? []).map((p: any) => (
              <Link to="/projects/$id" params={{ id: p.id }} key={p.id}>
                <article className="h-full rounded-2xl border border-border bg-card p-6 shadow-soft transition hover:border-accent/40 hover:shadow-elevated">
                  <div className="mb-3 flex items-start justify-between gap-3">
                    <h3 className="text-lg font-bold leading-snug text-primary">{p.title}</h3>
                    <span className="shrink-0 rounded-full bg-success/10 px-3 py-1 text-xs font-bold text-success">مفتوح</span>
                  </div>
                  <p className="mb-4 line-clamp-2 text-sm text-muted-foreground">{p.description}</p>
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
                    <div className="flex items-center gap-3 text-muted-foreground">
                      <span className="flex items-center gap-1"><Users className="h-3.5 w-3.5" /> {p.proposals_count ?? 0} عرض</span>
                    </div>
                  </div>
                </article>
              </Link>
            ))}
          </div>
        )}
      </section>
      <Footer />
    </div>
  );
}