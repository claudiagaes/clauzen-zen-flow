import { useEffect, useState } from "react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Check, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { isoDate, markBillPaid, type Bill } from "@/lib/bills";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  bill: Bill | null;
  expectedDue: Date | null;
  onPaid?: () => void;
}

export function MarkBillPaidDialog({ open, onOpenChange, bill, expectedDue, onPaid }: Props) {
  const [amount, setAmount] = useState("");
  const [paidDate, setPaidDate] = useState(isoDate(new Date()));
  const [notes, setNotes] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const isCreditCard = bill?.category === "credit_card";

  useEffect(() => {
    if (open && bill) {
      setAmount(bill.amount != null ? String(bill.amount) : "");
      setPaidDate(isoDate(new Date()));
      setNotes("");
    }
  }, [open, bill]);

  const submit = async () => {
    if (!bill) return;
    const parsed = amount ? Number(amount) : null;
    if (isCreditCard && (parsed == null || !Number.isFinite(parsed) || parsed <= 0)) {
      toast.error("Enter the amount paid");
      return;
    }
    if (amount && (!Number.isFinite(parsed!) || parsed! < 0)) {
      toast.error("Enter a valid amount");
      return;
    }
    if (!paidDate) {
      toast.error("Pick a payment date");
      return;
    }
    setSubmitting(true);
    const created = await markBillPaid({
      bill_id: bill.id,
      amount_paid: parsed,
      due_date: expectedDue ? isoDate(expectedDue) : null,
      paid_date: paidDate,
      currency: bill.currency,
      notes: notes.trim() || null,
    });
    setSubmitting(false);
    if (!created) {
      toast.error("Couldn't mark as paid. Try again.");
      return;
    }
    toast.success(`${bill.name} marked as paid ✅`);
    onOpenChange(false);
    onPaid?.();
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="rounded-3xl border-0 shadow-soft max-w-sm">
        <DialogHeader>
          <DialogTitle className="font-display text-xl">
            {bill?.emoji ?? "💸"} Mark as paid
          </DialogTitle>
          <DialogDescription>
            {bill?.name}
            {expectedDue && (
              <> · due {expectedDue.toLocaleDateString("en-US", { month: "short", day: "numeric" })}</>
            )}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-3 mt-2">
          <div className="space-y-1.5">
            <Label htmlFor="paid-amount" className="text-xs">
              Amount paid {isCreditCard ? <span className="text-[hsl(var(--owe))]">*</span> : bill?.amount == null && "(this bill is variable)"}
            </Label>
            <div className="flex gap-2">
              <Input
                id="paid-amount"
                type="number"
                inputMode="decimal"
                step="0.01"
                min="0"
                placeholder={isCreditCard ? "Required" : "Optional"}
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                className="rounded-xl border-0 bg-secondary tabular-nums"
                autoFocus={isCreditCard}
              />
              <div className="flex items-center px-3 rounded-xl bg-secondary text-sm text-muted-foreground">
                {bill?.currency ?? "USD"}
              </div>
            </div>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="paid-date" className="text-xs">Payment date</Label>
            <Input
              id="paid-date"
              type="date"
              value={paidDate}
              onChange={(e) => setPaidDate(e.target.value)}
              className="rounded-xl border-0 bg-secondary"
            />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="paid-notes" className="text-xs">Notes (optional)</Label>
            <Textarea
              id="paid-notes"
              placeholder="e.g. statement balance, autopay…"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              maxLength={500}
              rows={2}
              className="rounded-xl border-0 bg-secondary resize-none"
            />
          </div>

          <div className="flex justify-end gap-2 pt-1">
            <Button variant="ghost" onClick={() => onOpenChange(false)} disabled={submitting} className="rounded-2xl">
              Cancel
            </Button>
            <Button onClick={submit} disabled={submitting} className="rounded-2xl">
              {submitting ? (
                <><Loader2 className="h-4 w-4 animate-spin" /> Saving…</>
              ) : (
                <><Check className="h-4 w-4" /> Confirm</>
              )}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
