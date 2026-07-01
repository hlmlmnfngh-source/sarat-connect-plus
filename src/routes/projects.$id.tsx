import { createFileRoute, Link, notFound } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
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

function ProjectDetail() {
  const { id } = Route.useParams();
  const [mode, setMode] = useState<Mode>("projects");

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
            <span className="rounded-full bg-success/10 px-3 py-1 text-xs font-bold text-success">مفتوح</span>
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
            <Link to="/auth">
              <Button variant="hero" size="lg" className="w-full">
                قدّم عرضك
                <ArrowLeft className="h-4 w-4" />
              </Button>
            </Link>
          </div>
        </aside>
      </div>
      <Footer />
    </div>
  );
}