import { useState } from "react";
import { Star } from "lucide-react";
import { toast } from "sonner";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { supabase } from "@/integrations/supabase/client";

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  orderId: string;
  reviewerId: string;
  revieweeId: string;
  reviewType: "buyer_to_seller" | "seller_to_buyer";
  onSubmitted?: () => void;
};

export function ReviewDialog({
  open,
  onOpenChange,
  orderId,
  reviewerId,
  revieweeId,
  reviewType,
  onSubmitted,
}: Props) {
  const [rating, setRating] = useState(5);
  const [comment, setComment] = useState("");
  const [saving, setSaving] = useState(false);

  async function submit() {
    setSaving(true);
    const { error } = await supabase.from("reviews").insert({
      order_id: orderId,
      reviewer_id: reviewerId,
      reviewee_id: revieweeId,
      review_type: reviewType,
      rating,
      comment: comment.trim() || null,
    });
    setSaving(false);
    if (error) {
      toast.error("تعذّر إرسال التقييم");
      return;
    }
    toast.success("شكراً لك، تم إرسال تقييمك");
    setComment("");
    setRating(5);
    onOpenChange(false);
    onSubmitted?.();
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent dir="rtl" className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="text-right">
            {reviewType === "buyer_to_seller" ? "قيّم البائع" : "قيّم المشتري"}
          </DialogTitle>
          <DialogDescription className="text-right">
            تقييمك يساعد بقية المستخدمين على اتخاذ قرار أفضل.
          </DialogDescription>
        </DialogHeader>

        <div className="flex justify-center gap-1 py-2">
          {[1, 2, 3, 4, 5].map((n) => (
            <button
              key={n}
              type="button"
              aria-label={`${n} نجوم`}
              onClick={() => setRating(n)}
              className="p-1"
            >
              <Star
                className={`h-7 w-7 ${n <= rating ? "fill-warning text-warning" : "text-muted-foreground"}`}
              />
            </button>
          ))}
        </div>

        <Textarea
          value={comment}
          onChange={(e) => setComment(e.target.value)}
          maxLength={1000}
          placeholder="اكتب تعليقاً (اختياري)"
          className="text-right"
        />

        <DialogFooter>
          <Button variant="hero" onClick={submit} disabled={saving}>
            {saving ? "جارٍ الإرسال…" : "إرسال التقييم"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
