import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";

const headers = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, content-type",
  "Content-Type": "application/json",
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers });
  const auth = req.headers.get("Authorization");
  if (!auth) return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401, headers });

  const url = Deno.env.get("SUPABASE_URL")!;
  const anon = Deno.env.get("SUPABASE_ANON_KEY")!;
  const service = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  const userClient = createClient(url, anon, { global: { headers: { Authorization: auth } } });
  const admin = createClient(url, service);
  const { data: { user } } = await userClient.auth.getUser();
  if (!user) return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401, headers });

  const { data: role } = await admin.from("user_roles").select("role")
    .eq("user_id", user.id).in("role", ["admin", "moderator"]).maybeSingle();
  if (!role) return new Response(JSON.stringify({ error: "ليس لديك صلاحية الإدارة" }), { status: 403, headers });

  try {
    const body = await req.json().catch(() => ({}));
    const action = String(body.action ?? "list");

    if (action === "list") {
      const { data, error } = await admin.from("profiles")
        .select("id,username,full_name,avatar_url,email_verified,verification_status,identity_document_path,verification_notes,verification_submitted_at,verification_reviewed_at,is_verified,account_type,created_at")
        .eq("verification_status", "pending")
        .order("verification_submitted_at", { ascending: true });
      if (error) throw error;

      const rows = await Promise.all((data ?? []).map(async (p) => {
        let documentUrl: string | null = null;
        if (p.identity_document_path) {
          const signed = await admin.storage.from("id-verification").createSignedUrl(p.identity_document_path, 600);
          documentUrl = signed.data?.signedUrl ?? null;
        }
        return { ...p, document_url: documentUrl };
      }));
      return new Response(JSON.stringify({ items: rows }), { headers });
    }

    if (action === "review") {
      const userId = String(body.user_id ?? "");
      const status = String(body.status ?? "");
      const notes = String(body.notes ?? "").trim() || null;
      if (!userId || !["approved", "rejected"].includes(status)) throw new Error("بيانات المراجعة غير صالحة");

      const { data: target, error: targetError } = await admin.from("profiles")
        .select("id,full_name,username,identity_document_path,email_verified").eq("id", userId).maybeSingle();
      if (targetError || !target) throw new Error("المستخدم غير موجود");
      if (!target.identity_document_path) throw new Error("لا توجد وثيقة هوية للمراجعة");
      if (!target.email_verified) throw new Error("يجب تأكيد البريد الإلكتروني قبل اعتماد الهوية");

      const { error } = await admin.from("profiles").update({
        verification_status: status,
        is_verified: status === "approved",
        verification_notes: notes,
        verification_reviewed_at: new Date().toISOString(),
      }).eq("id", userId);
      if (error) throw error;

      await admin.from("notifications").insert({
        user_id: userId,
        type: "system",
        title: status === "approved" ? "تم توثيق هويتك" : "تحتاج وثيقة الهوية إلى مراجعة",
        message: status === "approved" ? "تم اعتماد وثيقة هويتك ويمكنك الآن استخدام مزايا الحساب الموثق." : "تم رفض وثيقة الهوية. " + (notes ?? "يرجى رفع وثيقة أوضح وسارية المفعول."),
        link: "/settings",
        is_read: false,
      });
      return new Response(JSON.stringify({ ok: true, status }), { headers });
    }

    throw new Error("عملية غير معروفة");
  } catch (error) {
    return new Response(JSON.stringify({ error: error instanceof Error ? error.message : "تعذر تنفيذ العملية" }), { status: 400, headers });
  }
});