import { useRef, useState } from "react";
import { toast } from "sonner";
import {
  ShieldCheck,
  Phone,
  CheckCircle2,
  Upload,
  FileText,
  Info,
  X,
  ChevronDown,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";

const ACCEPTED = "image/png,image/jpeg,image/webp,application/pdf";
const MAX_BYTES = 10 * 1024 * 1024;

export function SmsProviderNotice() {
  const [dismissed, setDismissed] = useState(false);
  if (dismissed) return null;
  return (
    <div className="relative mb-4 rounded-xl border border-accent/30 bg-accent/5 p-3 pl-9 text-right text-xs leading-relaxed text-muted-foreground">
      <button
        type="button"
        onClick={() => setDismissed(true)}
        aria-label="إغلاق التنبيه"
        className="absolute left-2 top-2 text-muted-foreground transition hover:text-primary"
      >
        <X className="h-3.5 w-3.5" />
      </button>
      <Info className="ml-1 inline h-3.5 w-3.5 text-accent" />
      ملاحظة للمطوّر: إرسال رمز التحقق عبر SMS يتطلب تفعيل مصادقة الهاتف ومزوّد رسائل (مثل Twilio)
      في إعدادات المصادقة بالمشروع. حتى يتم ذلك لن تصل الرسائل فعليًا رغم أن التدفق مُنفّذ بشكل صحيح.
    </div>
  );
}

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

export function useIdentityVerification(userId: string | undefined) {
  const [phone, setPhone] = useState("+970");
  const [code, setCode] = useState("");
  const [sent, setSent] = useState(false);
  const [phoneVerified, setPhoneVerified] = useState(false);
  const [sending, setSending] = useState(false);
  const [verifying, setVerifying] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [docPath, setDocPath] = useState<string | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);

  const sendCode = async () => {
    const clean = phone.replace(/\s+/g, "");
    if (!/^\+\d{8,15}$/.test(clean)) {
      toast.error("أدخل رقم جوال صحيح بصيغة دولية مثل ‎+970591234567");
      return;
    }
    setSending(true);
    const { error } = await supabase.auth.updateUser({ phone: clean });
    setSending(false);
    if (error) {
      toast.error(error.message);
      return;
    }
    setSent(true);
    toast.success("تم إرسال رمز التحقق");
  };

  const verifyCode = async () => {
    if (code.trim().length !== 6) {
      toast.error("الرمز يتكون من ٦ أرقام");
      return;
    }
    setVerifying(true);
    const clean = phone.replace(/\s+/g, "");
    const { error } = await supabase.auth.verifyOtp({
      phone: clean,
      token: code.trim(),
      type: "phone_change",
    });
    if (error) {
      setVerifying(false);
      toast.error(error.message);
      return;
    }
    if (userId) {
      await supabase.from("profiles").update({ phone: clean, phone_verified: true }).eq("id", userId);
    }
    setVerifying(false);
    setPhoneVerified(true);
    toast.success("تم توثيق رقم الجوال");
  };

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
    if (updErr) {
      setUploading(false);
      toast.error(updErr.message);
      return;
    }
    setDocPath(path);
    if (file.type.startsWith("image/")) {
      const { data } = await supabase.storage.from("id-verification").createSignedUrl(path, 300);
      setPreviewUrl(data?.signedUrl ?? null);
    } else {
      setPreviewUrl(null);
    }
    setUploading(false);
    toast.success("تم رفع الوثيقة بنجاح");
  };

  return {
    phone, setPhone, code, setCode, sent, phoneVerified, sending, verifying,
    uploading, docPath, previewUrl, sendCode, verifyCode, uploadDocument,
  };
}

export function IdentityFields({ v }: { v: ReturnType<typeof useIdentityVerification> }) {
  const fileRef = useRef<HTMLInputElement>(null);

  return (
    <div className="space-y-6 text-right">
      {/* الهاتف */}
      <div>
        <label className="mb-1.5 block text-sm font-bold text-primary">رقم الجوال</label>
        {v.phoneVerified ? (
          <div className="flex items-center gap-2 rounded-lg border border-green-500/40 bg-green-500/10 px-3 py-3 text-sm font-bold text-green-600">
            <CheckCircle2 className="h-5 w-5" />
            تم توثيق رقم الجوال
            <span dir="ltr" className="text-muted-foreground">{v.phone}</span>
          </div>
        ) : (
          <>
            <div className="flex gap-2">
              <div className="relative flex-1">
                <Phone className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <input
                  type="tel"
                  dir="ltr"
                  value={v.phone}
                  onChange={(e) => v.setPhone(e.target.value)}
                  placeholder="+970591234567"
                  className="h-12 w-full rounded-lg border border-input bg-background pr-10 pl-3 text-sm outline-none focus:border-accent focus:ring-2 focus:ring-accent/20"
                />
              </div>
              <Button
                type="button"
                variant="outline"
                className="h-12 shrink-0"
                onClick={v.sendCode}
                disabled={v.sending || v.verifying}
              >
                {v.sending ? "جارٍ الإرسال..." : v.sent ? "إعادة الإرسال" : "إرسال رمز التحقق"}
              </Button>
            </div>
            {v.sent && (
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
            )}
          </>
        )}
      </div>

      {/* الوثيقة */}
      <div>
        <label className="mb-1.5 block text-sm font-bold text-primary">وثيقة الهوية (بطاقة شخصية أو جواز سفر)</label>
        <input
          ref={fileRef}
          type="file"
          accept={ACCEPTED}
          className="hidden"
          onChange={(e) => {
            const f = e.target.files?.[0];
            if (f) void v.uploadDocument(f);
            e.target.value = "";
          }}
        />
        {v.docPath ? (
          <div className="flex items-center gap-3 rounded-lg border border-border bg-muted/40 p-3">
            {v.previewUrl ? (
              <img src={v.previewUrl} alt="معاينة وثيقة الهوية" className="h-16 w-16 rounded-lg object-cover" />
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
            <Button type="button" variant="ghost" size="sm" onClick={() => fileRef.current?.click()} disabled={v.uploading}>
              تغيير
            </Button>
          </div>
        ) : (
          <button
            type="button"
            onClick={() => fileRef.current?.click()}
            disabled={v.uploading}
            className="flex w-full flex-col items-center gap-2 rounded-lg border-2 border-dashed border-border bg-background p-6 transition hover:border-accent disabled:opacity-60"
          >
            <Upload className="h-6 w-6 text-muted-foreground" />
            <span className="text-sm font-bold text-primary">
              {v.uploading ? "جارٍ الرفع..." : "اختر صورة أو ملف PDF"}
            </span>
            <span className="text-xs text-muted-foreground">JPG أو PNG أو PDF — بحد أقصى ١٠ ميجابايت</span>
          </button>
        )}
      </div>
    </div>
  );
}

export function VerificationStep({
  userId,
  onDone,
}: {
  userId: string | undefined;
  onDone: () => void;
}) {
  const v = useIdentityVerification(userId);
  const ready = v.phoneVerified && !!v.docPath;

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
            خطوة إلزامية لحماية المنصة — وثّق رقم جوالك وارفع وثيقة هويتك
          </p>

          <SmsProviderNotice />
          <IdentityFields v={v} />

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
              يجب توثيق الجوال ورفع الوثيقة للمتابعة
            </p>
          )}

          <WhyAsk />
        </div>
      </div>
    </div>
  );
}
