import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { Clock, Star, Zap } from "lucide-react";
import { PageShell, PageHero } from "@/components/site/PageShell";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/fast-services")({
  head: () => ({ meta: [{ title: "خدمات سريعة — سرعات" }, { name: "description", content: "خدمات منشورة فعليًا في سرعات بمدة تسليم يوم واحد أو أقل." }] }),
  component: FastServicesPage,
});

type QuickService = {
  id: string;
  title: string;
  price: number;
  delivery_days: number;
  rating: number | null;
  reviews_count: number | null;
};

function FastServicesPage() {
  const servicesQuery = useQuery({
    queryKey: ["fast-services"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("services")
        .select("id, title, price, delivery_days, rating, reviews_count")
        .eq("status", "active")
        .lte("delivery_days", 1)
        .order("created_at", { ascending: false })
        .limit(60);
      if (error) throw error;
      return (data ?? []) as QuickService[];
    },
  });

  return (
    <PageShell>
      <PageHero title="خدمات سريعة ⚡" subtitle="خدمات منشورة فعليًا بمدة تسليم يوم واحد أو أقل." />
      <section className="container mx-auto max-w-6xl px-4 py-14 lg:px-6">
        {servicesQuery.isPending ? (
          <p className="text-center text-muted-foreground">جارٍ تحميل الخدمات…</p>
        ) : servicesQuery.isError ? (
          <p role="alert" className="text-center text-destructive">تعذّر تحميل الخدمات حاليًا. حاول مرة أخرى لاحقًا.</p>
        ) : servicesQuery.data.length === 0 ? (
          <div className="rounded-2xl border border-border bg-card p-8 text-center">
            <p className="font-bold text-primary">لا توجد خدمات منشورة تطابق مدة التسليم هذه حاليًا.</p>
            <Link to="/services" className="mt-4 inline-block font-bold text-accent hover:underline">تصفّح جميع الخدمات</Link>
          </div>
        ) : (
          <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {servicesQuery.data.map((service) => (
              <Link key={service.id} to="/services/$id" params={{ id: service.id }} className="group rounded-2xl border border-border bg-card p-5 shadow-soft transition hover:shadow-glow">
                <div className="mb-3 flex items-center justify-between">
                  <span className="flex items-center gap-1 rounded-full bg-accent/10 px-2.5 py-1 text-xs font-bold text-accent"><Zap className="h-3 w-3" /> يوم أو أقل</span>
                  {service.rating !== null && <span className="flex items-center gap-1 text-xs font-bold text-warning"><Star className="h-3 w-3 fill-current" /> {service.rating.toFixed(1)}{service.reviews_count !== null ? ` (${service.reviews_count})` : ""}</span>}
                </div>
                <h3 className="text-base font-extrabold text-primary group-hover:text-accent">{service.title}</h3>
                <div className="mt-4 flex items-center justify-between border-t border-border pt-3">
                  <span className="flex items-center gap-1 text-xs text-muted-foreground"><Clock className="h-3 w-3" /> {service.delivery_days} {service.delivery_days === 1 ? "يوم" : "أيام"}</span>
                  <span className="text-lg font-extrabold text-primary">${Number(service.price).toFixed(2)}</span>
                </div>
              </Link>
            ))}
          </div>
        )}
      </section>
    </PageShell>
  );
}
