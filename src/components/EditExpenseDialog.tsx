import { useEffect, useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { CATEGORIES, updateExpense, type Currency, type Expense } from "@/lib/data";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";

const CURRENCIES: Currency[] = ["USD", "EUR", "GBP", "MXN"];

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  expense: Expense | null;
  onSaved?: () => void;
}

export function EditExpenseDialog({ open, onOpenChange, expense, onSaved }: Props) {
  const [date, setDate] = useState("");
  const [description, setDescription] = useState("");
  const [amount, setAmount] = useState("");
  const [myAmount, setMyAmount] = useState("");
  const [currency, setCurrency] = useState<Currency>("USD");
  const [category, setCategory] = useState<string>(CATEGORIES[0].key);
  const [notes, setNotes] = useState("");
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!expense || !open) return;
    setDate(expense.date.slice(0, 10));
    setDescription(expense.description);
    setAmount(String(expense.total_amount));
    setMyAmount(expense.my_amount != null ? String(expense.my_amount) : "");
    setCurrency(expense.currency);
    setCategory(expense.category);
    setNotes(expense.notes ?? "");
  }, [expense, open]);

  const handleSave = async () => {
    if (!expense) return;
    const amt = parseFloat(amount);
    if (!description.trim()) return toast.error("Add a description");
    if (!isFinite(amt) || amt <= 0) return toast.error("Amount must be > 0");
    if (!date) return toast.error("Pick a date");

    let myAmt: number | null = null;
    if (myAmount.trim() !== "") {
      const parsed = parseFloat(myAmount);
      if (!isFinite(parsed) || parsed < 0) return toast.error("Your share must be ≥ 0");
      myAmt = parsed;
    }

    setSubmitting(true);
    const ok = await updateExpense(expense.id, {
      date,
      description: description.trim(),
      total_amount: amt,
      my_amount: myAmt,
      currency,
      category,
      notes: notes.trim() ? notes.trim() : null,
    });
    setSubmitting(false);
    if (ok) {
      toast.success("Expense updated");
      onOpenChange(false);
      onSaved?.();
    } else {
      toast.error("Couldn't update expense");
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="rounded-3xl border-0 shadow-card max-w-lg">
        <DialogHeader>
          <DialogTitle className="font-display text-2xl">Edit expense</DialogTitle>
          <DialogDescription>Update the details and save.</DialogDescription>
        </DialogHeader>

        <div className="space-y-4 mt-2">
          <div className="space-y-1.5">
            <Label htmlFor="edit-desc">Description</Label>
            <Input id="edit-desc" value={description} onChange={(e) => setDescription(e.target.value)} className="rounded-2xl" />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="edit-date">Date</Label>
              <Input id="edit-date" type="date" value={date} onChange={(e) => setDate(e.target.value)} className="rounded-2xl" />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="edit-amount">Total amount</Label>
              <Input
                id="edit-amount"
                type="number"
                step="0.01"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                className="rounded-2xl"
              />
            </div>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="edit-myamount">Your share <span className="text-muted-foreground font-normal">(leave empty to use total)</span></Label>
            <Input
              id="edit-myamount"
              type="number"
              step="0.01"
              value={myAmount}
              onChange={(e) => setMyAmount(e.target.value)}
              className="rounded-2xl"
              placeholder="Optional"
            />

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label>Currency</Label>
              <Select value={currency} onValueChange={(v) => setCurrency(v as Currency)}>
                <SelectTrigger className="rounded-2xl"><SelectValue /></SelectTrigger>
                <SelectContent className="rounded-2xl">
                  {CURRENCIES.map((c) => (
                    <SelectItem key={c} value={c} className="rounded-xl">{c}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>Category</Label>
              <Select value={category} onValueChange={setCategory}>
                <SelectTrigger className="rounded-2xl"><SelectValue /></SelectTrigger>
                <SelectContent className="rounded-2xl max-h-72">
                  {CATEGORIES.map((c) => (
                    <SelectItem key={c.key} value={c.key} className="rounded-xl">
                      {c.emoji} {c.key}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="edit-notes">Notes</Label>
            <Textarea
              id="edit-notes"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              className="rounded-2xl min-h-[80px]"
              placeholder="Optional"
            />
          </div>
        </div>

        <div className="flex justify-end gap-2 pt-4">
          <Button variant="ghost" onClick={() => onOpenChange(false)} className="rounded-2xl">Cancel</Button>
          <Button onClick={handleSave} disabled={submitting} className="rounded-2xl">
            {submitting && <Loader2 className="h-4 w-4 animate-spin" />} Save
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
