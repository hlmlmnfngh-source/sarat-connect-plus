import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { Star, BadgeCheck, CalendarDays, Clock, Wallet } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { PageShell } from "@/components/site/PageShell";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";

export const Route = createFileRoute("/profile/$userId")({
  head: () => ({
    meta: [
      { title: "الملف الشخصي — سرعات" },
      { name: "description", content: "استعرض الملف الشخصي للمستقل: تقييماته، خدماته المنشورة وتاريخ انضمامه لمنصة سرعات." },
      { property: "og:title", content: "الملف الشخصي — سرعات" },
      { property: "og:description", content: "استعرض تقييمات المستقل وخدماته المنشورة على منصة سرعات." },
      { property: "og:type", content: "profile" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: PublicProfile,
  errorComponent: ({ error }) => <div className="p-10 text-center text-sm text-muted-foreground">{error.message}</div>,
  notFoundComponent: () => <div className="p-10 text-center">المستخدم غير موجود</div>,
});

function PublicProfile() {
  const { userId } = Route.useParams();
  const { user: currentUser } = useAuth();
  const isOwnProfile = currentUser?.id === userId;

  const profileQ = useQuery({
    queryKey: ["public-profile", userId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("profiles")
        .select("id, username, full_name, avatar_url, cover_url, bio, skills, languages, rating, reviews_count, is_verified, account_type, seller_level, response_time_hours, created_at")
        .eq("id", userId)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
  });

  const servicesQ = useQuery({
    queryKey: ["public-profile-services", userId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("services")
        .select("id, title, price, delivery_days, rating, reviews_count, gallery_images")
        .eq("seller_id", userId)
        .eq("status", "active")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data ?? [];
    },
  });

  const reviewsQ = useQuery({
    queryKey: ["public-profile-reviews", userId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("reviews")
        .select("id, rating, comment, created_at")
        .eq("reviewee_id", userId)
        .order("created_at", { ascending: false })
        .limit(10);
      if (error) return [];
      return data ?? [];
    },
  });

  const verificationQ = useQuery({
    queryKey: ["profile-verification", userId],
    enabled: isOwnProfile,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("profiles")
        .select("verification_status, identity_document_path")
        .eq("id", userId)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
  });

  const p = profileQ.data;


  return (
    <PageShell>
      {profileQ.isLoading ? (
        <div className="p-16 text-center text-muted-foreground">جارٍ التحميل...</div>
      ) : !p ? (
        <div className="p-16 text-center text-muted-foreground">لم يتم العثور على هذا المستخدم</div>
      ) : (
        <>
          <section className="border-b border-border bg-gradient-to-br from-primary to-primary/90 text-primary-foreground">
            <div className="container mx-auto flex flex-col items-center gap-4 px-4 py-14 text-center lg:px-6">
              <div className="flex h-24 w-24 items-center justify-center overflow-hidden rounded-full bg-gradient-accent text-3xl font-extrabold text-accent-foreground">
                {p.avatar_url ? (
                  <img src={p.avatar_url} alt={p.full_name ?? "صورة المستخدم"} className="h-full w-full object-cover" />
                ) : (
                  (p.full_name ?? p.username ?? "?")[0]?.toUpperCase()
                )}
              </div>
              <h1 className="flex items-center gap-2 text-3xl font-extrabold md:text-4xl">
                {p.full_name ?? p.username ?? "مستخدم"}
                {p.is_verified && <BadgeCheck className="h-6 w-6 text-accent" />}
              </h1>
              {p.username && <p className="text-primary-foreground/70">@{p.username}</p>}
              {p.bio && <p className="max-w-2xl text-primary-foreground/80">{p.bio}</p>}
              <div className="flex flex-wrap items-center justify-center gap-4 text-sm text-primary-foreground/80">
                <span className="flex items-center gap-1">
                  <Star className="h-4 w-4 fill-accent text-accent" />
                  {(p.rating ?? 0).toFixed(1)} ({p.reviews_count ?? 0} تقييم)
                </span>
                <span className="flex items-center gap-1">
                  <CalendarDays className="h-4 w-4" />
                  انضم في {new Date(p.created_at).toLocaleDateString("ar")}
                </span>
                {p.response_time_hours != null && (
                  <span className="flex items-center gap-1">
                    <Clock className="h-4 w-4" />
                    يرد خلال {p.response_time_hours} ساعة
                  </span>
                )}
              </div>
            </div>
          </section>

          <div className="container mx-auto grid gap-8 px-4 py-12 lg:grid-cols-3 lg:px-6">
            <div className="space-y-6">
              {isOwnProfile && (
                <Card className="p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <h2 className="text-lg font-bold">المحفظة</h2>
                      <p className="mt-1 text-sm text-muted-foreground">رصيدك وعمليات الدفع</p>
                    </div>
                    <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/10 text-primary">
                      <Wallet className="h-5 w-5" />
                    </div>
                  </div>
                  <Link
                    to="/wallet"
                    className="mt-4 inline-flex w-full items-center justify-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition hover:opacity-90"
                  >
                    إدارة المحفظة
                  </Link>
                </Card>
              )}
              <Card className="p-6">
                <h2 className="mb-3 text-lg font-bold">المهارات</h2>
                <div className="flex flex-wrap gap-2">
                  {(p.skills ?? []).length === 0 ? (
                    <p className="text-sm text-muted-foreground">لا توجد مهارات مضافة</p>
                  ) : (
                    (p.skills ?? []).map((s: string) => <Badge key={s} variant="secondary">{s}</Badge>)
                  )}
                </div>
              </Card>
              <Card className="p-6">
                <h2 className="mb-3 text-lg font-bold">اللغات</h2>
                <div className="flex flex-wrap gap-2">
                  {(p.languages ?? []).length === 0 ? (
                    <p className="text-sm text-muted-foreground">غير محدد</p>
                  ) : (
                    (p.languages ?? []).map((s: string) => <Badge key={s} variant="outline">{s}</Badge>)
                  )}
                </div>
              </Card>
            </div>

            <div className="space-y-8 lg:col-span-2">
              <section>
                <h2 className="mb-4 text-xl font-bold">الخدمات المنشورة</h2>
                {servicesQ.data?.length ? (
                  <div className="grid gap-4 sm:grid-cols-2">
                    {servicesQ.data.map((s) => (
                      <Link key={s.id} to="/services/$id" params={{ id: s.id }}>
                        <Card className="h-full p-4 transition hover:shadow-soft">
                          <h3 className="line-clamp-2 font-bold">{s.title}</h3>
                          <div className="mt-3 flex items-center justify-between text-sm text-muted-foreground">
                            <span className="flex items-center gap-1">
                              <Star className="h-4 w-4 fill-accent text-accent" />
                              {(s.rating ?? 0).toFixed(1)}
                            </span>
                            <span className="font-bold text-foreground">${s.price}</span>
                          </div>
                        </Card>
                      </Link>
                    ))}
                  </div>
                ) : (
                  <p className="text-sm text-muted-foreground">لا توجد خدمات منشورة بعد</p>
                )}
              </section>

              <section>
                <h2 className="mb-4 text-xl font-bold">التقييمات</h2>
                {reviewsQ.data?.length ? (
                  <div className="space-y-3">
                    {reviewsQ.data.map((r) => (
                      <Card key={r.id} className="p-4">
                        <div className="flex items-center gap-1 text-accent">
                          {Array.from({ length: r.rating }).map((_, i) => (
                            <Star key={i} className="h-4 w-4 fill-accent" />
                          ))}
                        </div>
                        {r.comment && <p className="mt-2 text-sm text-foreground/80">{r.comment}</p>}
                        <p className="mt-2 text-xs text-muted-foreground">{new Date(r.created_at).toLocaleDateString("ar")}</p>
                      </Card>
                    ))}
                  </div>
                ) : (
                  <p className="text-sm text-muted-foreground">لا توجد تقييمات بعد</p>
                )}
              </section>
            </div>
          </div>
        </>
      )}
    </PageShell>
  );
}