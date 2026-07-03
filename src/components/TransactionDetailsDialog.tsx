import { useEffect, useState } from "react";
import { Loader2, Copy, ExternalLink, ReceiptText } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";

export type TxnLike = {
  id: string;
  type: "earning" | "withdrawal" | "purchase" | "refund";
  amount: number;
  currency: string;
  status: "pending" | "completed" | "failed";
  description: string | null;
  reference_id: string | null;
  created_at: string;
  stripe_session_id?: string | null;
  stripe_payment_intent_id?: string | null;
  stripe_refund_id?: string | null;
};

type OrderLite = {
  id: string;
  price: number;
  status: string;
  package_type: string | null;
  requirements: string | null;
  created_at: string;
  paid_at: string | null;
  delivered_at: string | null;
  completed_at: string | null;
  refunded_at: string | null;
  stripe_session_id: string | null;
  stripe_payment_intent_id: string | null;
  stripe_refund_id: string | null;
  service: { id: string; title: string } | null;
  project: { id: string; title: string } | null;
};

function fmt(amount: number, currency: string) {
  try {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: (currency || "usd").toUpperCase(),
    }).format(amount);
  } catch {
    return `$${amount.toFixed(2)}`;
  }
}

function CopyId({ value }: { value: string }) {
  const [ok, setOk] = useState(false);
  return (
    <button
      type="button"
      onClick={async () => {
        await navigator.clipboard.writeText(value);
        setOk(true);
        setTimeout(() => setOk(false), 1200);
      }}
      className="inline-flex items-center gap-1 rounded-md border border-border bg-muted/40 px-2 py-1 text-[11px] font-mono hover:bg-muted"
      title="نسخ"
    >
      <span className="max-w-[220px] truncate">{value}</span>
      <Copy className="h-3 w-3" />
      {ok && <span className="text-success">✓</span>}
    </button>
  );
}

function Row({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex items-start justify-between gap-3 py-2">
      <span className="text-xs text-muted-foreground">{label}</span>
      <div className="text-sm font-medium text-primary text-left [direction:ltr]">{children}</div>
    </div>
  );
}

export function TransactionDetailsDialog({
  txn,
  open,
  onOpenChange,
}: {
  txn: TxnLike | null;
  open: boolean;
  onOpenChange: (v: boolean) => void;
}) {
  const [order, setOrder] = useState<OrderLite | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!open || !txn) return;
    setOrder(null);
    setError(null);
    if (!txn.reference_id) return;
    setLoading(true);
    (async () => {
      const { data, error } = await supabase
        .from("orders")
        .select(
          "id,price,status,package_type,requirements,created_at,paid_at,delivered_at,completed_at,refunded_at,stripe_session_id,stripe_payment_intent_id,stripe_refund_id,service:services(id,title),project:projects(id,title)",
        )
        .eq("id", txn.reference_id as string)
        .maybeSingle();
      if (error) setError(error.message);
      else setOrder((data as unknown as OrderLite) ?? null);
      setLoading(false);
    })();
  }, [open, txn]);

  if (!txn) return null;

  const credit = txn.type === "earning" || txn.type === "refund";
  const sessionId = txn.stripe_session_id ?? order?.stripe_session_id ?? null;
  const paymentIntentId = txn.stripe_payment_intent_id ?? order?.stripe_payment_intent_id ?? null;
  const refundId = txn.stripe_refund_id ?? order?.stripe_refund_id ?? null;
  const isRefunded = Boolean(refundId) || txn.type === "refund" || order?.status === "cancelled";
  const itemTitle = order?.service?.title ?? order?.project?.title ?? txn.description ?? "—";

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <ReceiptText className="h-5 w-5 text-accent" />
            تفاصيل المعاملة
          </DialogTitle>
          <DialogDescription>
            رقم المعاملة: <span className="font-mono">{txn.id.slice(0, 8)}</span>
          </DialogDescription>
        </DialogHeader>

        <div className="rounded-xl border border-border bg-muted/30 p-4">
          <div className="flex items-center justify-between">
            <div>
              <div className="text-xs text-muted-foreground">
                {txn.type === "purchase" ? "شراء" : txn.type === "refund" ? "استرداد" : txn.type === "earning" ? "أرباح" : "سحب"}
              </div>
              <div className={`mt-1 text-2xl font-extrabold ${credit ? "text-success" : "text-primary"}`}>
                {credit ? "+" : "-"}
                {fmt(Number(txn.amount), txn.currency || "usd")}
              </div>
            </div>
            <span
              className={`rounded-full px-2.5 py-1 text-xs font-bold ${
                txn.status === "completed"
                  ? "bg-success/10 text-success"
                  : txn.status === "pending"
                    ? "bg-accent/10 text-accent"
                    : "bg-destructive/10 text-destructive"
              }`}
            >
              {txn.status}
            </span>
          </div>
        </div>

        <div className="mt-2 divide-y divide-border">
          <Row label="الوصف">{itemTitle}</Row>
          <Row label="التاريخ">{new Date(txn.created_at).toLocaleString("ar")}</Row>
          {order && (
            <>
              <Row label="حالة الطلب">{order.status}</Row>
              {order.package_type && <Row label="الباقة">{order.package_type}</Row>}
              {order.paid_at && <Row label="تم الدفع">{new Date(order.paid_at).toLocaleString("ar")}</Row>}
              {order.delivered_at && <Row label="تم التسليم">{new Date(order.delivered_at).toLocaleString("ar")}</Row>}
              {order.completed_at && <Row label="اكتمل">{new Date(order.completed_at).toLocaleString("ar")}</Row>}
              {order.refunded_at && <Row label="تم الاسترداد">{new Date(order.refunded_at).toLocaleString("ar")}</Row>}
            </>
          )}
        </div>

        <div className="mt-2 rounded-xl border border-border p-4">
          <div className="mb-2 text-xs font-bold uppercase text-muted-foreground">Stripe</div>
          {loading ? (
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Loader2 className="h-4 w-4 animate-spin" /> جارٍ التحميل…
            </div>
          ) : (
            <div className="space-y-2">
              {sessionId && (
                <div className="flex items-center justify-between gap-2">
                  <span className="text-xs text-muted-foreground">Checkout Session</span>
                  <CopyId value={sessionId} />
                </div>
              )}
              {paymentIntentId && (
                <div className="flex items-center justify-between gap-2">
                  <span className="text-xs text-muted-foreground">Payment Intent</span>
                  <a
                    href={`https://dashboard.stripe.com/payments/${paymentIntentId}`}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex items-center gap-1 rounded-md border border-border bg-muted/40 px-2 py-1 font-mono text-[11px] hover:bg-muted"
                  >
                    <span className="max-w-[200px] truncate">{paymentIntentId}</span>
                    <ExternalLink className="h-3 w-3" />
                  </a>
                </div>
              )}
              {refundId && (
                <div className="flex items-center justify-between gap-2">
                  <span className="text-xs text-muted-foreground">Refund</span>
                  <CopyId value={refundId} />
                </div>
              )}
              {!sessionId && !paymentIntentId && !refundId && (
                <div className="text-sm text-muted-foreground">لا توجد بيانات دفع Stripe مرتبطة.</div>
              )}
              {isRefunded && (
                <div className="mt-2 rounded-md bg-destructive/10 px-3 py-2 text-xs font-bold text-destructive">
                  تم استرداد هذه المعاملة
                </div>
              )}
            </div>
          )}
          {error && <div className="mt-2 text-xs text-destructive">{error}</div>}
        </div>

        {order && (
          <div className="mt-2 rounded-xl border border-border p-4">
            <div className="mb-2 text-xs font-bold uppercase text-muted-foreground">العناصر</div>
            <div className="flex items-center justify-between gap-3 text-sm">
              <div className="min-w-0">
                <div className="truncate font-bold text-primary">{itemTitle}</div>
                {order.package_type && (
                  <div className="text-xs text-muted-foreground">باقة {order.package_type}</div>
                )}
              </div>
              <div className="font-extrabold text-primary">{fmt(Number(order.price), txn.currency || "usd")}</div>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}