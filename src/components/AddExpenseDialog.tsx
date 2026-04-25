import { useEffect, useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { CATEGORIES, createExpense, getContacts, type Contact, type Currency, type NewExpenseInput } from "@/lib/data";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command";
import { Check, ChevronsUpDown, Loader2, Plus, X } from "lucide-react";
import { toast } from "sonner";
import { z } from "zod";

const ME = "Claudia";
const CURRENCIES: Currency[] = ["USD", "EUR", "GBP"];

const schema = z.object({
  date: z.string().min(1, "Pick a date"),
  description: z.string().trim().min(1, "Add a description").max(140, "Too long"),
  amount: z.number({ invalid_type_error: "Amount required" }).positive("Must be > 0").max(1_000_000),
  currency: z.enum(["USD", "EUR", "GBP"]),
  category: z.string().min(1),
  event_tag: z.string().trim().max(60).optional(),
  paid_by: z.string().min(1),
});

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onCreated?: () => void;
}

export function AddExpenseDialog({ open, onOpenChange, onCreated }: Props) {
  const todayISO = new Date().toISOString().slice(0, 10);
  const [date, setDate] = useState(todayISO);
  const [description, setDescription] = useState("");
  const [amount, setAmount] = useState("");
  const [currency, setCurrency] = useState<Currency>("USD");
  const [category, setCategory] = useState<string>(CATEGORIES[0].key);
  const [eventTag, setEventTag] = useState("");
  const [paidBy, setPaidBy] = useState<string>(ME);
  const [sharedWith, setSharedWith] = useState<string[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [loadingContacts, setLoadingContacts] = useState(false);

  // Load contacts whenever the dialog opens (so newly added contacts show up).
  useEffect(() => {
    if (!open) return;
    setLoadingContacts(true);
    getContacts()
      .then(setContacts)
      .finally(() => setLoadingContacts(false));
  }, [open]);

  const reset = () => {
    setDate(todayISO);
    setDescription("");
    setAmount("");
    setCurrency("USD");
    setCategory(CATEGORIES[0].key);
    setEventTag("");
    setPaidBy(ME);
    setSharedWith([]);
  };

  const togglePerson = (name: string) => {
    setSharedWith((prev) => (prev.includes(name) ? prev.filter((p) => p !== name) : [...prev, name]));
  };

  const submit = async () => {
    const parsed = schema.safeParse({
      date,
      description,
      amount: Number(amount),
      currency,
      category,
      event_tag: eventTag || undefined,
      paid_by: paidBy,
    });
    if (!parsed.success) {
      toast.error(parsed.error.errors[0]?.message ?? "Check the form");
      return;
    }

    // Make sure payer is not also in sharedWith.
    const others = sharedWith.filter((p) => p !== paidBy);

    setSubmitting(true);
    const input: NewExpenseInput = {
      date: new Date(date).toISOString(),
      description: parsed.data.description,
      total_amount: parsed.data.amount,
      currency: parsed.data.currency,
      category: parsed.data.category,
      event_tag: parsed.data.event_tag ?? null,
      paid_by: parsed.data.paid_by,
      shared_with: others,
    };
    const created = await createExpense(input);
    setSubmitting(false);
    if (!created) {
      toast.error("Couldn't save expense. Try again.");
      return;
    }
    toast.success("Expense added ✨");
    reset();
    onOpenChange(false);
    onCreated?.();
  };

  // "You" + dynamic contacts from Supabase. Dedup by name in case ME is also a contact.
  const contactNames = contacts.map((c) => c.name).filter((n) => n && n !== ME);
  const people = [ME, ...contactNames];

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
          <DialogTitle className="font-display text-2xl">Add expense</DialogTitle>
          <DialogDescription>A calm new entry — splits are saved instantly.</DialogDescription>
        </DialogHeader>

        <div className="space-y-4 mt-2">
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="exp-date" className="text-xs">Date</Label>
              <Input
                id="exp-date"
                type="date"
                value={date}
                onChange={(e) => setDate(e.target.value)}
                className="rounded-xl border-0 bg-secondary"
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="exp-amount" className="text-xs">Amount</Label>
              <div className="flex gap-2">
                <Input
                  id="exp-amount"
                  type="number"
                  inputMode="decimal"
                  step="0.01"
                  min="0"
                  placeholder="0.00"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  className="rounded-xl border-0 bg-secondary tabular-nums"
                />
                <Select value={currency} onValueChange={(v) => setCurrency(v as Currency)}>
                  <SelectTrigger className="w-24 rounded-xl border-0 bg-secondary">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="rounded-2xl border-0 shadow-card">
                    {CURRENCIES.map((c) => (
                      <SelectItem key={c} value={c} className="rounded-xl">{c}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="exp-desc" className="text-xs">Description</Label>
            <Input
              id="exp-desc"
              placeholder="Sushi at Kintaro…"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              maxLength={140}
              className="rounded-xl border-0 bg-secondary"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label className="text-xs">Category</Label>
              <Select value={category} onValueChange={setCategory}>
                <SelectTrigger className="rounded-xl border-0 bg-secondary">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="rounded-2xl border-0 shadow-card max-h-80">
                  {CATEGORIES.map((c) => (
                    <SelectItem key={c.key} value={c.key} className="rounded-xl">
                      <span className="inline-flex items-center gap-2">
                        <span>{c.emoji}</span>
                        <span>{c.key}</span>
                      </span>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="exp-event" className="text-xs">Event tag (optional)</Label>
              <Input
                id="exp-event"
                placeholder="Lisbon Trip"
                value={eventTag}
                onChange={(e) => setEventTag(e.target.value)}
                maxLength={60}
                className="rounded-xl border-0 bg-secondary"
              />
            </div>
          </div>

          <div className="space-y-1.5">
            <Label className="text-xs">Paid by</Label>
            <PersonCombobox
              value={paidBy}
              onChange={setPaidBy}
              people={people}
              me={ME}
              placeholder="Search who paid…"
              loading={loadingContacts}
            />
          </div>

          <div className="space-y-2">
            <Label className="text-xs">Shared with</Label>
            <SharedWithCombobox
              selected={sharedWith}
              onToggle={togglePerson}
              onClear={() => setSharedWith([])}
              people={people.filter((p) => p !== paidBy)}
              me={ME}
              loading={loadingContacts}
            />
            {sharedWith.length > 0 && (
              <div className="flex flex-wrap gap-1.5 pt-1">
                {sharedWith.map((p) => (
                  <button
                    key={p}
                    type="button"
                    onClick={() => togglePerson(p)}
                    className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs bg-primary text-primary-foreground hover:bg-primary/90"
                  >
                    {p === ME ? "You" : p}
                    <X className="h-3 w-3" />
                  </button>
                ))}
              </div>
            )}
            {sharedWith.length === 0 && !loadingContacts && (
              <p className="text-[11px] text-muted-foreground">
                Leave empty for a personal expense (no splits created).
              </p>
            )}
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <Button
              variant="ghost"
              onClick={() => onOpenChange(false)}
              disabled={submitting}
              className="rounded-2xl"
            >
              Cancel
            </Button>
            <Button onClick={submit} disabled={submitting} className="rounded-2xl">
              {submitting ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" /> Saving…
                </>
              ) : (
                <>
                  <Plus className="h-4 w-4" /> Save expense
                </>
              )}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
