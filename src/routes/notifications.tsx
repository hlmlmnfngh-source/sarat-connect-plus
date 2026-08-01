import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState, useCallback } from "react";
import { Bell, MessageSquare, ShoppingBag, CreditCard, Star, FileText, Check } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { PageShell, PageHero } from "@/components/site/PageShell";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/notifications")({
  head: () => ({
    meta: [
      { title: "الإشعارات — سرعات" },
      { name: "description", content: "تابع إشعارات الرسائل والطلبات والمدفوعات الخاصة بحسابك على منصة سرعات." },
      { property: "og:title", content: "الإشعارات — سرعات" },
      { property: "og:description", content: "كل تحديثات حسابك في مكان واحد." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: NotificationsPage,
});

type Notif = {
  id: string;
  type: string;
  title: string;
  message: string | null;
  link: string | null;
  is_read: boolean | null;
  created_at: string;
};

const iconFor = (t: string) =>
  t === "message" ? MessageSquare : t === "order" ? ShoppingBag : t === "payment" ? CreditCard : t === "review" ? Star : t === "proposal" ? FileText : Bell;

function NotificationsPage() {
  const { user, loading } = useAuth();
  const navigate = useNavigate();
  const [items, setItems] = useState<Notif[]>([]);
  const [busy, setBusy] = useState(true);

  useEffect(() => {
    if (!loading && !user) navigate({ to: "/auth" });
  }, [loading, user, navigate]);

  const load = useCallback(async () => {
    if (!user) return;
    const { data } = await supabase
      .from("notifications")
      .select("id, type, title, message, link, is_read, created_at")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false })
      .limit(50);
    setItems((data as Notif[]) ?? []);
    setBusy(false);
  }, [user]);

  useEffect(() => {
    void load();
  }, [load]);

  useEffect(() => {
    if (!user) return;
    const channel = supabase
      .channel(`user:${user.id}`, { config: { private: true } })
      .on("broadcast", { event: "new_notification" }, () => void load())
      .subscribe();
    return () => {
      void supabase.removeChannel(channel);
    };
  }, [user, load]);

  const markAll = async () => {
    if (!user) return;
    await supabase.from("notifications").update({ is_read: true }).eq("user_id", user.id).eq("is_read", false);
    void load();
  };

  const markOne = async (id: string) => {
    await supabase.from("notifications").update({ is_read: true }).eq("id", id);
    setItems((prev) => prev.map((n) => (n.id === id ? { ...n, is_read: true } : n)));
  };

  const unread = items.filter((n) => !n.is_read).length;

  return (
    <PageShell>
      <PageHero title="الإشعارات" subtitle="كل تحديثات حسابك في مكان واحد" />
      <div className="container mx-auto max-w-3xl px-4 py-12 lg:px-6">
        <div className="mb-5 flex items-center justify-between">
          <p className="text-sm text-muted-foreground">{unread} إشعار غير مقروء</p>
          {unread > 0 && (
            <Button variant="outline" size="sm" onClick={markAll}>
              <Check className="ml-1 h-4 w-4" /> تعليم الكل كمقروء
            </Button>
          )}
        </div>

        {busy ? (
          <p className="text-center text-muted-foreground">جارٍ التحميل...</p>
        ) : items.length === 0 ? (
          <Card className="p-12 text-center">
            <Bell className="mx-auto mb-3 h-10 w-10 text-muted-foreground" />
            <p className="text-muted-foreground">لا توجد إشعارات حتى الآن</p>
          </Card>
        ) : (
          <div className="space-y-3">
            {items.map((n) => {
              const Icon = iconFor(n.type);
              return (
                <Card
                  key={n.id}
                  onClick={() => !n.is_read && markOne(n.id)}
                  className={cn("flex cursor-pointer items-start gap-3 p-4 transition hover:shadow-soft", !n.is_read && "border-accent/40 bg-accent/5")}
                >
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-muted text-accent">
                    <Icon className="h-5 w-5" />
                  </div>
                  <div className="flex-1">
                    <h3 className="font-bold">{n.title}</h3>
                    {n.message && <p className="mt-1 text-sm text-muted-foreground">{n.message}</p>}
                    <p className="mt-1 text-xs text-muted-foreground">{new Date(n.created_at).toLocaleString("ar")}</p>
                  </div>
                  {!n.is_read && <span className="mt-2 h-2 w-2 shrink-0 rounded-full bg-accent" />}
                </Card>
              );
            })}
          </div>
        )}

        <p className="mt-8 text-center text-sm text-muted-foreground">
          يمكنك ضبط تفضيلات الإشعارات من <Link to="/settings" className="text-accent">صفحة الإعدادات</Link>
        </p>
      </div>
    </PageShell>
  );
}