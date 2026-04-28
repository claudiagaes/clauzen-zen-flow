import { useEffect, useState } from "react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { updateBill, type Bill, type BillCurrency } from "@/lib/bills";
import { Archive, ArchiveRestore, Loader2, Save } from "lucide-react";
import { toast } from "sonner";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  bill: Bill | null;
  onSaved?: () => void;
}

export function EditBillDialog({ open, onOpenChange, bill, onSaved }: Props) {
  const [name, setName] = useState("");
  const [emoji, setEmoji] = useState("");
  const [amount, setAmount] = useState("");
  const [currency, setCurrency] = useState<BillCurrency>("USD");
  const [dueDay, setDueDay] = useState("");
  const [endOfMonth, setEndOfMonth] = useState(false);
  const [dueDate, setDueDate] = useState("");
  const [notes, setNotes] = useState("");
  const [isActive, setIsActive] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!bill) return;
    setName(bill.name);
    setEmoji(bill.emoji ?? "");
    setAmount(bill.amount != null ? String(bill.amount) : "");
    setCurrency(bill.currency);
    setDueDay(bill.due_day != null ? String(bill.due_day) : "");
    setEndOfMonth(!!bill.due_day_end_of_month);
    setDueDate(bill.due_date ?? "");
    setNotes(bill.notes ?? "");
    setIsActive(bill.is_active);
  }, [bill]);

  if (!bill) return null;

  const isRecurring = bill.type === "recurring";

  const submit = async () => {
    if (!name.trim()) {
      toast.error("Name required");
      return;
    }
    setSubmitting(true);
    const patch = {
      name: name.trim(),
      emoji: emoji.trim() || null,
      amount: amount ? Number(amount) : null,
      currency,
      notes: notes.trim() || null,
      is_active: isActive,
      ...(isRecurring
        ? {
            due_day_end_of_month: endOfMonth,
            due_day: endOfMonth ? null : dueDay ? Number(dueDay) : null,
            due_date: null,
          }
        : {
            due_date: dueDate || null,
            due_day: null,
            due_day_end_of_month: false,
          }),
    };
    const updated = await updateBill(bill.id, patch);
    setSubmitting(false);
    if (!updated) {
      toast.error("Couldn't save changes.");
      return;
    }
    toast.success("Bill updated ✨");
    onOpenChange(false);
    onSaved?.();
  };

  const toggleArchive = async () => {
    setSubmitting(true);
    const updated = await updateBill(bill.id, { is_active: !bill.is_active });
    setSubmitting(false);
    if (!updated) {
      toast.error("Couldn't update.");
      return;
    }
    toast.success(updated.is_active ? "Bill restored" : "Bill archived");
    onOpenChange(false);
    onSaved?.();
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="rounded-3xl border-0 shadow-soft max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="font-display text-2xl">Edit bill</DialogTitle>
          <DialogDescription>Update details or archive to hide without losing history.</DialogDescription>
        </DialogHeader>

        <div className="space-y-4 mt-2">
          <div className="grid grid-cols-[1fr_4rem] gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="edit-bill-name" className="text-xs">Name</Label>
              <Input id="edit-bill-name" value={name} onChange={(e) => setName(e.target.value)} maxLength={80}
                className="rounded-xl border-0 bg-secondary" />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="edit-bill-emoji" className="text-xs">Emoji</Label>
              <Input id="edit-bill-emoji" value={emoji} onChange={(e) => setEmoji(e.target.value)} maxLength={4}
                className="rounded-xl border-0 bg-secondary text-center" />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="edit-bill-amount" className="text-xs">Amount</Label>
              <Input id="edit-bill-amount" type="number" step="0.01" min="0" placeholder="Leave blank if variable"
                value={amount} onChange={(e) => setAmount(e.target.value)}
                className="rounded-xl border-0 bg-secondary tabular-nums" />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Currency</Label>
              <Select value={currency} onValueChange={(v) => setCurrency(v as BillCurrency)}>
                <SelectTrigger className="rounded-xl border-0 bg-secondary"><SelectValue /></SelectTrigger>
                <SelectContent className="rounded-2xl border-0 shadow-card">
                  <SelectItem value="USD" className="rounded-xl">USD</SelectItem>
                  <SelectItem value="MXN" className="rounded-xl">MXN</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {isRecurring ? (
            <div className="space-y-3">
              <div className="flex items-center justify-between rounded-xl bg-secondary px-3 py-2.5">
                <div>
                  <Label htmlFor="edit-end-of-month" className="text-sm">End of month</Label>
                  <p className="text-[11px] text-muted-foreground">Due on the last day of each month.</p>
                </div>
                <Switch id="edit-end-of-month" checked={endOfMonth} onCheckedChange={setEndOfMonth} />
              </div>
              {!endOfMonth && (
                <div className="space-y-1.5">
                  <Label htmlFor="edit-due-day" className="text-xs">Due day (1–31)</Label>
                  <Input id="edit-due-day" type="number" min="1" max="31" value={dueDay}
                    onChange={(e) => setDueDay(e.target.value)}
                    className="rounded-xl border-0 bg-secondary" />
                </div>
              )}
            </div>
          ) : (
            <div className="space-y-1.5">
              <Label htmlFor="edit-due-date" className="text-xs">Due date</Label>
              <Input id="edit-due-date" type="date" value={dueDate} onChange={(e) => setDueDate(e.target.value)}
                className="rounded-xl border-0 bg-secondary" />
            </div>
          )}

          <div className="space-y-1.5">
            <Label htmlFor="edit-bill-notes" className="text-xs">Notes</Label>
            <Textarea id="edit-bill-notes" value={notes} onChange={(e) => setNotes(e.target.value)}
              maxLength={500} rows={2} className="rounded-xl border-0 bg-secondary resize-none" />
          </div>

          <div className="flex items-center justify-between rounded-xl bg-secondary px-3 py-2.5">
            <div>
              <Label htmlFor="edit-is-active" className="text-sm">Active</Label>
              <p className="text-[11px] text-muted-foreground">Inactive bills are hidden from the main list.</p>
            </div>
            <Switch id="edit-is-active" checked={isActive} onCheckedChange={setIsActive} />
          </div>

          <div className="flex justify-between gap-2 pt-2">
            <Button variant="ghost" onClick={toggleArchive} disabled={submitting} className="rounded-2xl">
              {bill.is_active ? (
                <><Archive className="h-4 w-4" /> Archive</>
              ) : (
                <><ArchiveRestore className="h-4 w-4" /> Restore</>
              )}
            </Button>
            <div className="flex gap-2">
              <Button variant="ghost" onClick={() => onOpenChange(false)} disabled={submitting} className="rounded-2xl">
                Cancel
              </Button>
              <Button onClick={submit} disabled={submitting} className="rounded-2xl">
                {submitting ? <><Loader2 className="h-4 w-4 animate-spin" /> Saving…</> : <><Save className="h-4 w-4" /> Save</>}
              </Button>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
