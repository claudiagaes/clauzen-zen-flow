import { useState } from "react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { BILL_CATEGORIES, createBill, type BillCategory, type BillCurrency, type BillType, type NewBillInput } from "@/lib/bills";
import { Loader2, Plus } from "lucide-react";
import { toast } from "sonner";
import { z } from "zod";

const schema = z
  .object({
    name: z.string().trim().min(1, "Name required").max(80),
    emoji: z.string().trim().max(4).optional(),
    category: z.enum(["rent", "credit_card", "subscription", "utility", "phone", "other"]),
    amount: z.number().positive().max(1_000_000).optional().nullable(),
    currency: z.enum(["USD", "MXN"]),
    type: z.enum(["recurring", "one_time"]),
    due_day: z.number().int().min(1).max(31).optional().nullable(),
    due_day_end_of_month: z.boolean(),
    due_date: z.string().optional().nullable(),
    notes: z.string().trim().max(500).optional(),
  })
  .refine(
    (v) =>
      v.type === "one_time"
        ? !!v.due_date
        : v.due_day_end_of_month || (v.due_day != null && v.due_day >= 1 && v.due_day <= 31),
    { message: "Pick a due day or date" },
  );

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onCreated?: () => void;
}

export function AddBillDialog({ open, onOpenChange, onCreated }: Props) {
  const [name, setName] = useState("");
  const [emoji, setEmoji] = useState("");
  const [category, setCategory] = useState<BillCategory>("subscription");
  const [amount, setAmount] = useState("");
  const [currency, setCurrency] = useState<BillCurrency>("USD");
  const [type, setType] = useState<BillType>("recurring");
  const [dueDay, setDueDay] = useState("");
  const [endOfMonth, setEndOfMonth] = useState(false);
  const [dueDate, setDueDate] = useState("");
  const [notes, setNotes] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const reset = () => {
    setName("");
    setEmoji("");
    setCategory("subscription");
    setAmount("");
    setCurrency("USD");
    setType("recurring");
    setDueDay("");
    setEndOfMonth(false);
    setDueDate("");
    setNotes("");
  };

  const submit = async () => {
    const parsed = schema.safeParse({
      name,
      emoji: emoji || undefined,
      category,
      amount: amount ? Number(amount) : null,
      currency,
      type,
      due_day: type === "recurring" && !endOfMonth && dueDay ? Number(dueDay) : null,
      due_day_end_of_month: type === "recurring" ? endOfMonth : false,
      due_date: type === "one_time" ? dueDate || null : null,
      notes: notes || undefined,
    });
    if (!parsed.success) {
      toast.error(parsed.error.errors[0]?.message ?? "Check the form");
      return;
    }
    setSubmitting(true);
    const input: NewBillInput = {
      name: parsed.data.name,
      emoji: parsed.data.emoji ?? null,
      category: parsed.data.category,
      amount: parsed.data.amount ?? null,
      currency: parsed.data.currency,
      type: parsed.data.type,
      due_day: parsed.data.due_day ?? null,
      due_day_end_of_month: parsed.data.due_day_end_of_month,
      due_date: parsed.data.due_date ?? null,
      notes: parsed.data.notes ?? null,
    };
    const created = await createBill(input);
    setSubmitting(false);
    if (!created) {
      toast.error("Couldn't save bill. Try again.");
      return;
    }
    toast.success("Bill added ✨");
    reset();
    onOpenChange(false);
    onCreated?.();
  };

  return (
    <Dialog
      open={open}
      onOpenChange={(o) => {
        if (!o) reset();
        onOpenChange(o);
      }}
    >
      <DialogContent className="rounded-3xl border-0 shadow-soft max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="font-display text-2xl">Add bill</DialogTitle>
          <DialogDescription>Track a recurring or one-time obligation.</DialogDescription>
        </DialogHeader>

        <div className="space-y-4 mt-2">
          <div className="grid grid-cols-[1fr_4rem] gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="bill-name" className="text-xs">Name</Label>
              <Input
                id="bill-name"
                placeholder="Netflix, Chase card…"
                value={name}
                onChange={(e) => setName(e.target.value)}
                maxLength={80}
                className="rounded-xl border-0 bg-secondary"
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="bill-emoji" className="text-xs">Emoji</Label>
              <Input
                id="bill-emoji"
                placeholder="📺"
                value={emoji}
                onChange={(e) => setEmoji(e.target.value)}
                maxLength={4}
                className="rounded-xl border-0 bg-secondary text-center"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label className="text-xs">Category</Label>
              <Select value={category} onValueChange={(v) => setCategory(v as BillCategory)}>
                <SelectTrigger className="rounded-xl border-0 bg-secondary">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="rounded-2xl border-0 shadow-card">
                  {BILL_CATEGORIES.map((c) => (
                    <SelectItem key={c.key} value={c.key} className="rounded-xl">
                      <span className="inline-flex items-center gap-2">
                        <span>{c.emoji}</span>
                        <span>{c.label}</span>
                      </span>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Type</Label>
              <Select value={type} onValueChange={(v) => setType(v as BillType)}>
                <SelectTrigger className="rounded-xl border-0 bg-secondary">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="rounded-2xl border-0 shadow-card">
                  <SelectItem value="recurring" className="rounded-xl">Recurring</SelectItem>
                  <SelectItem value="one_time" className="rounded-xl">One-time</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="bill-amount" className="text-xs">Amount (optional)</Label>
              <Input
                id="bill-amount"
                type="number"
                inputMode="decimal"
                step="0.01"
                min="0"
                placeholder="Leave blank if variable"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                className="rounded-xl border-0 bg-secondary tabular-nums"
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Currency</Label>
              <Select value={currency} onValueChange={(v) => setCurrency(v as BillCurrency)}>
                <SelectTrigger className="rounded-xl border-0 bg-secondary">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="rounded-2xl border-0 shadow-card">
                  <SelectItem value="USD" className="rounded-xl">USD</SelectItem>
                  <SelectItem value="MXN" className="rounded-xl">MXN</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {type === "recurring" ? (
            <div className="space-y-3">
              <div className="flex items-center justify-between rounded-xl bg-secondary px-3 py-2.5">
                <div>
                  <Label htmlFor="end-of-month" className="text-sm">End of month</Label>
                  <p className="text-[11px] text-muted-foreground">Due on the last day of each month.</p>
                </div>
                <Switch id="end-of-month" checked={endOfMonth} onCheckedChange={setEndOfMonth} />
              </div>
              {!endOfMonth && (
                <div className="space-y-1.5">
                  <Label htmlFor="bill-due-day" className="text-xs">Due day (1–31)</Label>
                  <Input
                    id="bill-due-day"
                    type="number"
                    min="1"
                    max="31"
                    placeholder="e.g. 15"
                    value={dueDay}
                    onChange={(e) => setDueDay(e.target.value)}
                    className="rounded-xl border-0 bg-secondary"
                  />
                </div>
              )}
            </div>
          ) : (
            <div className="space-y-1.5">
              <Label htmlFor="bill-due-date" className="text-xs">Due date</Label>
              <Input
                id="bill-due-date"
                type="date"
                value={dueDate}
                onChange={(e) => setDueDate(e.target.value)}
                className="rounded-xl border-0 bg-secondary"
              />
            </div>
          )}

          <div className="space-y-1.5">
            <Label htmlFor="bill-notes" className="text-xs">Notes</Label>
            <Textarea
              id="bill-notes"
              placeholder="Optional context…"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              maxLength={500}
              rows={2}
              className="rounded-xl border-0 bg-secondary resize-none"
            />
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <Button variant="ghost" onClick={() => onOpenChange(false)} disabled={submitting} className="rounded-2xl">
              Cancel
            </Button>
            <Button onClick={submit} disabled={submitting} className="rounded-2xl">
              {submitting ? (
                <><Loader2 className="h-4 w-4 animate-spin" /> Saving…</>
              ) : (
                <><Plus className="h-4 w-4" /> Save bill</>
              )}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
