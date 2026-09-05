import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import {
  ShieldCheck,
  Mail,
  CheckCircle2,
  Upload,
  FileText,
  Info,
  ChevronDown,
  Clock,
  XCircle,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";

const ACCEPTED = "image/png,image/jpeg,image/webp,application/pdf";
const MAX_BYTES = 10 * 1024 * 1024;

export function WhyAsk() {
  const [open, setOpen] = useState(false);
  return (
    <div className="mt-4 text-right">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="inline-flex items-center gap-1 text-xs font-bold text-muted-foreground transition hover:text-primary"
      >
        <ChevronDown className={`h-3.5 w-3.5 transition-transform ${open ? "rotate-180" : ""}`} />
        لماذا نطلب هذا؟
      </button>
      {open && (
        <p className="mt-2 rounded-xl bg-muted p-3 text-xs leading-relaxed text-muted-foreground">
          توثيق الهوية يحمي المشترين والبائعين من الاحتيال والحسابات الوهمية، ويضمن أن الأموال
          تُحوَّل لأصحابها الحقيقيين — تمامًا كما هو معمول به في منصات مثل خمسات ومستقل. بياناتك
          مخزّنة بشكل خاص ولا يطّلع عليها سوى فريق المراجعة.
        </p>
      )}
    </div>
  );
}

export type VerificationStatus = "pending" | "approved" | "rejected";

export function VerificationStatusBadge({ status }: { status: string | null | undefined }) {
  const map: Record<string, { label: string; cls: string; Icon: typeof Clock }> = {
    approved: {
      label: "تم توثيق هويتك",
      cls: "border-green-500/40 bg-green-500/10 text-green-600",
      Icon: CheckCircle2,
    },
    rejected: {
      label: "تم رفض وثيقة الهوية",
      cls: "border-destructive/40 bg-destructive/10 text-destructive",
      Icon: XCircle,
    },
    pending: {
      label: "قيد المراجعة",
      cls: "border-yellow-500/40 bg-yellow-500/10 text-yellow-600",
      Icon: Clock,
    },
  };
  const s = map[status ?? "pending"] ?? map.pending;
  return (
    <span className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-xs font-bold ${s.cls}`}>
      <s.Icon className="h-3.5 w-3.5" />
      {s.label}
    </span>
  );
}

/** رفع وثيقة الهوية — منطق مشترك بين خطوة التسجيل وصفحة الإعدادات */
export function useIdDocumentUpload(userId: string | undefined, initialPath?: string | null) {
  const [uploading, setUploading] = useState(false);
  const [docPath, setDocPath] = useState<string | null>(initialPath ?? null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);

  useEffect(() => {
    if (initialPath !== undefined) setDocPath(initialPath);
  }, [initialPath]);

  useEffect(() => {
    let active = true;
    if (!docPath || /\.pdf$/i.test(docPath)) {
      setPreviewUrl(null);
      return;
    }
    supabase.storage
      .from("id-verification")
      .createSignedUrl(docPath, 300)
      .then(({ data }) => {
        if (active) setPreviewUrl(data?.signedUrl ?? null);
      });
    return () => {
      active = false;
    };
  }, [docPath]);

  const uploadDocument = async (file: File) => {
    if (!userId) return;
    if (file.size > MAX_BYTES) {
      toast.error("حجم الملف يجب ألا يتجاوز ١٠ ميجابايت");
      return;
    }
    setUploading(true);
    const ext = file.name.split(".").pop()?.toLowerCase() ?? "jpg";
    const path = `${userId}/id-${Date.now()}.${ext}`;
    const { error } = await supabase.storage.from("id-verification").upload(path, file, {
      upsert: false,
      contentType: file.type,
    });
    if (error) {
      setUploading(false);
      toast.error(error.message);
      return;
    }
    const { error: updErr } = await supabase
      .from("profiles")
      .update({ identity_document_path: path, verification_status: "pending" })
      .eq("id", userId);
    setUploading(false);
    if (updErr) {
      toast.error(updErr.message);
      return;
    }
    setDocPath(path);
    toast.success("تم رفع الوثيقة بنجاح");
  };

  return { uploading, docPath, previewUrl, uploadDocument };
}

export function IdDocumentField({
  u,
  label = "وثيقة الهوية (بطاقة شخصية أو جواز سفر)",
}: {
  u: ReturnType<typeof useIdDocumentUpload>;
  label?: string;
}) {
  const fileRef = useRef<HTMLInputElement>(null);
  return (
    <div className="text-right">
      <label className="mb-1.5 block text-sm font-bold text-primary">{label}</label>
      <input
        ref={fileRef}
        type="file"
        accept={ACCEPTED}
        className="hidden"
        onChange={(e) => {
          const f = e.target.files?.[0];
          if (f) void u.uploadDocument(f);
          e.target.value = "";
        }}
      />
      {u.docPath ? (
        <div className="flex items-center gap-3 rounded-lg border border-border bg-muted/40 p-3">
          {u.previewUrl ? (
            <img src={u.previewUrl} alt="معاينة وثيقة الهوية" className="h-16 w-16 rounded-lg object-cover" />
          ) : (
            <div className="flex h-16 w-16 items-center justify-center rounded-lg bg-background">
              <FileText className="h-7 w-7 text-muted-foreground" />
            </div>
          )}
          <div className="flex-1">
            <div className="flex items-center gap-1 text-sm font-bold text-green-600">
              <CheckCircle2 className="h-4 w-4" /> تم رفع الوثيقة
            </div>
            <p className="mt-0.5 text-xs text-muted-foreground">قيد المراجعة من فريق سرعات</p>
          </div>
          <Button type="button" variant="ghost" size="sm" onClick={() => fileRef.current?.click()} disabled={u.uploading}>
            {u.uploading ? "جارٍ الرفع..." : "تغيير"}
          </Button>
        </div>
      ) : (
        <button
          type="button"
          onClick={() => fileRef.current?.click()}
          disabled={u.uploading}
          className="flex w-full flex-col items-center gap-2 rounded-lg border-2 border-dashed border-border bg-background p-6 transition hover:border-accent disabled:opacity-60"
        >
          <Upload className="h-6 w-6 text-muted-foreground" />
          <span className="text-sm font-bold text-primary">
            {u.uploading ? "جارٍ الرفع..." : "اختر صورة أو ملف PDF"}
          </span>
          <span className="text-xs text-muted-foreground">JPG أو PNG أو PDF — بحد أقصى ١٠ ميجابايت</span>
        </button>
      )}
    </div>
  );
}

/** توثيق البريد الإلكتروني عبر رمز مكوّن من ٦ أرقام */
export function useEmailVerification(userId: string | undefined, email: string | undefined) {
  const [code, setCode] = useState("");
  const [sent, setSent] = useState(false);
  const [sending, setSending] = useState(false);
  const [verifying, setVerifying] = useState(false);
  const [emailVerified, setEmailVerified] = useState(false);

  const sendCode = async () => {
    if (!email) {
      toast.error("لا يوجد بريد إلكتروني مرتبط بحسابك");
      return;
    }
    setSending(true);
    const { error } = await supabase.auth.signInWithOtp({
      email,
      options: { shouldCreateUser: false },
    });
    setSending(false);
    if (error) {
      toast.error(error.message);
      return;
    }
    setSent(true);
    toast.success("تم إرسال رمز التحقق");
  };

  const verifyCode = async () => {
    if (!email) return;
    if (code.trim().length !== 6) {
      toast.error("الرمز يتكون من ٦ أرقام");
      return;
    }
    setVerifying(true);
    const { error } = await supabase.auth.verifyOtp({
      email,
      token: code.trim(),
      type: "email",
    });
    if (error) {
      setVerifying(false);
      toast.error(error.message);
      return;
    }
    if (userId) {
      await supabase.from("profiles").update({ email_verified: true }).eq("id", userId);
    }
    setVerifying(false);
    setEmailVerified(true);
    toast.success("تم توثيق بريدك الإلكتروني");
  };

  return { code, setCode, sent, sending, verifying, emailVerified, sendCode, verifyCode };
}

export function EmailVerificationField({
  v,
  email,
}: {
  v: ReturnType<typeof useEmailVerification>;
  email: string | undefined;
}) {
  return (
    <div className="text-right">
      <label className="mb-1.5 block text-sm font-bold text-primary">البريد الإلكتروني</label>
      {v.emailVerified ? (
        <div className="flex items-center gap-2 rounded-lg border border-green-500/40 bg-green-500/10 px-3 py-3 text-sm font-bold text-green-600">
          <CheckCircle2 className="h-5 w-5" />
          تم توثيق البريد الإلكتروني
          <span dir="ltr" className="text-muted-foreground">{email}</span>
        </div>
      ) : (
        <>
          <div className="flex gap-2">
            <div className="relative flex-1">
              <Mail className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <input
                type="email"
                dir="ltr"
                readOnly
                value={email ?? ""}
                className="h-12 w-full rounded-lg border border-input bg-muted/40 pr-10 pl-3 text-sm outline-none"
              />
            </div>
            <Button
              type="button"
              variant="outline"
              className="h-12 shrink-0"
              onClick={v.sendCode}
              disabled={v.sending || v.verifying}
            >
              {v.sending ? "جارٍ الإرسال..." : v.sent ? "إعادة الإرسال" : "إرسال رمز التحقق إلى بريدك الإلكتروني"}
            </Button>
          </div>
          {v.sent && (
            <>
              <p className="mt-2 flex items-start gap-1 text-xs text-muted-foreground">
                <Info className="mt-0.5 h-3.5 w-3.5 shrink-0 text-accent" />
                أرسلنا رمزًا مكوّنًا من ٦ أرقام إلى بريدك. إن لم يصلك، تفقّد مجلد الرسائل غير المرغوب فيها (Spam).
              </p>
              <div className="mt-3 flex gap-2">
                <input
                  type="text"
                  inputMode="numeric"
                  maxLength={6}
                  dir="ltr"
                  value={v.code}
                  onChange={(e) => v.setCode(e.target.value.replace(/\D/g, ""))}
                  placeholder="______"
                  className="h-12 w-full rounded-lg border border-input bg-background px-3 text-center text-lg tracking-[0.5em] outline-none focus:border-accent focus:ring-2 focus:ring-accent/20"
                />
                <Button type="button" className="h-12 shrink-0" onClick={v.verifyCode} disabled={v.verifying}>
                  {v.verifying ? "..." : "تأكيد الرمز"}
                </Button>
              </div>
            </>
          )}
        </>
      )}
    </div>
  );
}

export function VerificationStep({
  userId,
  email,
  onDone,
}: {
  userId: string | undefined;
  email: string | undefined;
  onDone: () => void;
}) {
  const v = useEmailVerification(userId, email);
  const u = useIdDocumentUpload(userId);
  const ready = v.emailVerified && !!u.docPath;

  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-hero px-4 py-10">
      <div className="w-full max-w-lg">
        <div className="rounded-3xl bg-card p-8 shadow-elevated">
          <div className="mb-2 flex justify-center">
            <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-accent shadow-glow">
              <ShieldCheck className="h-7 w-7 text-accent-foreground" />
            </div>
          </div>
          <h2 className="mb-2 text-center text-2xl font-extrabold text-primary">توثيق الهوية</h2>
          <p className="mb-6 text-center text-muted-foreground">
            خطوة إلزامية لحماية المنصة — وثّق بريدك الإلكتروني وارفع وثيقة هويتك
          </p>

          <div className="space-y-6">
            <EmailVerificationField v={v} email={email} />
            <IdDocumentField u={u} />
          </div>

          <Button
            type="button"
            variant="hero"
            size="lg"
            className="mt-6 w-full"
            disabled={!ready}
            onClick={onDone}
          >
            متابعة
          </Button>
          {!ready && (
            <p className="mt-2 text-center text-xs text-muted-foreground">
              يجب توثيق البريد الإلكتروني ورفع الوثيقة للمتابعة
            </p>
          )}

          <WhyAsk />
        </div>
      </div>
    </div>
  );
}
