import { createFileRoute, redirect } from "@tanstack/react-router";
import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";

type OAuthNs = {
  getAuthorizationDetails: (id: string) => Promise<{ data: any; error: any }>;
  approveAuthorization: (id: string) => Promise<{ data: any; error: any }>;
  denyAuthorization: (id: string) => Promise<{ data: any; error: any }>;
};
const oauthNs = () => (supabase.auth as unknown as { oauth: OAuthNs }).oauth;

export const Route = createFileRoute("/.lovable/oauth/consent")({
  ssr: false,
  validateSearch: (s: Record<string, unknown>) => ({
    authorization_id: typeof s.authorization_id === "string" ? s.authorization_id : "",
  }),
  beforeLoad: async ({ search, location }) => {
    if (!search.authorization_id) throw new Error("Missing authorization_id");
    const { data } = await supabase.auth.getSession();
    const next = location.pathname + location.searchStr;
    if (!data.session) throw redirect({ to: "/auth", search: { next } });
  },
  loader: async ({ location }) => {
    const authorizationId = new URLSearchParams(location.search).get("authorization_id")!;
    const { data, error } = await oauthNs().getAuthorizationDetails(authorizationId);
    if (error) throw error;
    const immediate = data?.redirect_url ?? data?.redirect_to;
    if (immediate && !data?.client) throw redirect({ href: immediate });
    return data;
  },
  component: Consent,
  errorComponent: ({ error }) => (
    <main dir="rtl" className="mx-auto max-w-md p-8 text-center">
      تعذّر تحميل طلب الربط: {String((error as Error)?.message ?? error)}
    </main>
  ),
});

function Consent() {
  const details = Route.useLoaderData() as any;
  const { authorization_id } = Route.useSearch();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const clientName = details?.client?.name ?? "تطبيق خارجي";

  async function decide(approve: boolean) {
    setBusy(true);
    const { data, error } = approve
      ? await oauthNs().approveAuthorization(authorization_id)
      : await oauthNs().denyAuthorization(authorization_id);
    if (error) {
      setBusy(false);
      setError(error.message);
      return;
    }
    const target = data?.redirect_url ?? data?.redirect_to;
    if (!target) {
      setBusy(false);
      setError("لم يُرجع خادم الصلاحيات رابط إعادة التوجيه.");
      return;
    }
    window.location.href = target;
  }

  return (
    <main dir="rtl" className="flex min-h-screen items-center justify-center px-4">
      <div className="w-full max-w-md rounded-3xl bg-card p-8 text-center shadow-elevated">
        <h1 className="mb-2 text-2xl font-extrabold text-primary">ربط {clientName} بحسابك</h1>
        <p className="mb-6 text-muted-foreground">
          سيتمكن {clientName} من استخدام أدوات سرعات نيابةً عنك بصلاحياتك أنت فقط.
        </p>
        {error && (
          <p role="alert" className="mb-4 text-sm text-destructive">
            {error}
          </p>
        )}
        <div className="flex gap-3">
          <Button className="flex-1" disabled={busy} onClick={() => decide(true)}>
            موافقة
          </Button>
          <Button className="flex-1" variant="outline" disabled={busy} onClick={() => decide(false)}>
            رفض
          </Button>
        </div>
      </div>
    </main>
  );
}