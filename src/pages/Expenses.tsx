import { useEffect, useMemo, useState } from "react";
import {
  CATEGORIES,
  deleteExpense,
  getCategoryMeta,
  getExpenses,
  getItemsForExpense,
  getMyAmount,
  getSplitsForExpense,
  resolveCategory,
  updateExpenseCategory,
  updateExpenseEventTag,
  type Expense,
  type ExpenseItem,
  type ExpenseSplit,
} from "@/lib/data";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { formatDate } from "@/lib/format";
import { useCurrency } from "@/contexts/CurrencyContext";
import { DateFilter, type DatePresetKey, type DateRange, presetToRange } from "@/components/DateFilter";
import { ChevronDown, Check, X, Plus, Pencil, Trash2 } from "lucide-react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { CategoryEditor } from "@/components/CategoryEditor";
import { EventTagEditor } from "@/components/EventTagEditor";
import { AddExpenseDialog } from "@/components/AddExpenseDialog";
import { EditExpenseDialog } from "@/components/EditExpenseDialog";
import { toast } from "sonner";

export default function Expenses() {
  const [all, setAll] = useState<Expense[]>([]);
  const [datePreset, setDatePreset] = useState<DatePresetKey>("this-month");
  const [dateRange, setDateRange] = useState<DateRange>(presetToRange("this-month"));
  const [category, setCategory] = useState<string>("all");
  const [event, setEvent] = useState<string>("all");
  const [currency, setCurrency] = useState<string>("all");
  const [openId, setOpenId] = useState<string | null>(null);
  const [addOpen, setAddOpen] = useState(false);
  const [editing, setEditing] = useState<Expense | null>(null);
  const [deleting, setDeleting] = useState<Expense | null>(null);
  const { format, convert } = useCurrency();

  const refresh = () => getExpenses().then(setAll);
  useEffect(() => { refresh(); }, []);

  const handleCategoryChange = async (expenseId: string, next: string) => {
    // Optimistic update.
    setAll((prev) => prev.map((e) => (e.id === expenseId ? { ...e, category: next } : e)));
    const ok = await updateExpenseCategory(expenseId, next);
    if (!ok) {
      toast.error("Couldn't update category");
      refresh();
    }
  };

  const handleEventTagChange = async (expenseId: string, next: string | null) => {
    setAll((prev) => prev.map((e) => (e.id === expenseId ? { ...e, event_tag: next } : e)));
    const ok = await updateExpenseEventTag(expenseId, next);
    if (!ok) {
      toast.error("Couldn't update event");
      refresh();
    } else {
      toast.success(next ? `Tagged as ${next}` : "Moved to Daily Life");
    }
  };

  const events = useMemo(
    () => Array.from(new Set(all.map((e) => e.event_tag).filter(Boolean) as string[])),
    [all],
  );
  const currencies = useMemo(() => Array.from(new Set(all.map((e) => e.currency))), [all]);

  const filtered = useMemo(() => {
    return all.filter((x) => {
      // Hide zero-share placeholder rows.
      if (Math.abs(getMyAmount(x)) < 0.005) return false;
      if (dateRange) {
        const t = +new Date(x.date);
        if (t < +dateRange.from || t > +dateRange.to) return false;
      }
      if (category !== "all" && resolveCategory(x.category) !== category) return false;
      if (event !== "all" && x.event_tag !== event) return false;
      if (currency !== "all" && x.currency !== currency) return false;
      return true;
    });
  }, [all, dateRange, category, event, currency]);

  return (
    <div className="space-y-8 pt-4 fade-in">
      <header className="flex items-start justify-between gap-4">
        <div>
          <h1 className="font-display text-3xl md:text-4xl">Expenses</h1>
          <p className="text-muted-foreground mt-1">Browse, filter, and breathe.</p>
        </div>
        <Button onClick={() => setAddOpen(true)} className="rounded-2xl shrink-0">
          <Plus className="h-4 w-4" /> Add expense
        </Button>
      </header>

      <Card className="rounded-3xl border-0 shadow-soft bg-card p-4 md:p-5">
        <div className="flex flex-wrap items-center gap-3">
          <DateFilter
            preset={datePreset}
            range={dateRange}
            onChange={(p, r) => {
              setDatePreset(p);
              setDateRange(r);
            }}
          />

          <FilterSelect value={category} onChange={setCategory} placeholder="All categories"
            options={[{ value: "all", label: "All categories" }, ...CATEGORIES.map(c => ({ value: c.key, label: `${c.emoji} ${c.key}` }))]}
          />
          <FilterSelect value={event} onChange={setEvent} placeholder="All events"
            options={[{ value: "all", label: "All events" }, ...events.map(e => ({ value: e, label: e }))]}
          />
          <FilterSelect value={currency} onChange={setCurrency} placeholder="All currencies"
            options={[{ value: "all", label: "All currencies" }, ...currencies.map(c => ({ value: c, label: c }))]}
          />

          <span className="ml-auto text-xs text-muted-foreground">
            {filtered.length} results · {format(filtered.reduce((a, x) => a + convert(getMyAmount(x), x.currency), 0))} your share
          </span>
        </div>
      </Card>

      <Card className="rounded-3xl border-0 shadow-soft bg-card overflow-hidden">
        {filtered.length === 0 && (
          <div className="text-sm text-muted-foreground py-16 text-center">
            No expenses match these filters.
          </div>
        )}
        <ul>
          {filtered.map((e, i) => (
            <ExpenseRow
              key={e.id}
              expense={e}
              isOpen={openId === e.id}
              onToggle={() => setOpenId(openId === e.id ? null : e.id)}
              onCategoryChange={(next) => handleCategoryChange(e.id, next)}
              onEventTagChange={(next) => handleEventTagChange(e.id, next)}
              eventOptions={events}
              first={i === 0}
            />
          ))}
        </ul>
      </Card>

      <AddExpenseDialog open={addOpen} onOpenChange={setAddOpen} onCreated={refresh} />
    </div>
  );
}

function FilterSelect({
  value, onChange, placeholder, options,
}: {
  value: string; onChange: (v: string) => void; placeholder: string;
  options: { value: string; label: string }[];
}) {
  return (
    <Select value={value} onValueChange={onChange}>
      <SelectTrigger className="h-9 w-[180px] rounded-2xl border-0 bg-secondary text-sm">
        <SelectValue placeholder={placeholder} />
      </SelectTrigger>
      <SelectContent className="rounded-2xl border-0 shadow-card bg-popover">
        {options.map((o) => (
          <SelectItem key={o.value} value={o.value} className="rounded-xl">{o.label}</SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}

function ExpenseRow({
  expense, isOpen, onToggle, onCategoryChange, onEventTagChange, eventOptions, first,
}: {
  expense: Expense;
  isOpen: boolean;
  onToggle: () => void;
  onCategoryChange: (next: string) => void;
  onEventTagChange: (next: string | null) => void;
  eventOptions: string[];
  first: boolean;
}) {
  const meta = getCategoryMeta(expense.category);
  const { format, formatNative, isConverted } = useCurrency();
  const converted = isConverted(expense.currency);
  const [splits, setSplits] = useState<ExpenseSplit[]>([]);
  const [items, setItems] = useState<ExpenseItem[]>([]);

  useEffect(() => {
    if (isOpen) {
      getSplitsForExpense(expense.id).then(setSplits);
      getItemsForExpense(expense.id).then(setItems);
    }
  }, [isOpen, expense.id]);

  return (
    <li className={`${first ? "" : "border-t border-border/50"}`}>
      <div
        className="w-full flex items-center gap-4 px-5 py-4 hover:bg-secondary/40 transition-colors"
      >
        <button
          type="button"
          onClick={onToggle}
          className="h-11 w-11 rounded-2xl flex items-center justify-center text-lg shrink-0 hover:opacity-90 transition-opacity"
          style={{ backgroundColor: `hsl(var(--${meta.token}))` }}
          aria-label="Toggle details"
        >
          {meta.emoji}
        </button>
        <button
          type="button"
          onClick={onToggle}
          className="min-w-0 flex-1 text-left"
        >
          <div className="text-sm font-medium truncate">{expense.description}</div>
          <div className="text-xs text-muted-foreground mt-0.5 flex items-center gap-2 flex-wrap">
            <span>{formatDate(expense.date, { month: "short", day: "numeric", year: "numeric" })}</span>
            {expense.is_shared && <><span>·</span><span className="text-primary">shared</span></>}
          </div>
        </button>
        <div className="hidden md:block">
          <CategoryEditor value={expense.category} onChange={onCategoryChange} />
        </div>
        <div className="hidden md:block">
          <EventTagEditor
            value={expense.event_tag}
            onChange={onEventTagChange}
            options={eventOptions}
          />
        </div>
        <button
          type="button"
          onClick={onToggle}
          className="text-right w-28"
        >
          <div className="text-sm font-medium tabular-nums">
            {format(getMyAmount(expense), expense.currency)}
          </div>
          {converted && (
            <div className="text-[10px] text-muted-foreground tabular-nums mt-0.5">
              from {formatNative(getMyAmount(expense), expense.currency)}
            </div>
          )}
          {expense.is_shared && expense.my_amount !== null && Math.abs(expense.my_amount - expense.total_amount) > 0.005 && (
            <div className="text-[10px] text-muted-foreground tabular-nums mt-0.5">
              of {format(expense.total_amount, expense.currency)}
            </div>
          )}
        </button>
        <button
          type="button"
          onClick={onToggle}
          aria-label={isOpen ? "Collapse" : "Expand"}
        >
          <ChevronDown className={`h-4 w-4 text-muted-foreground shrink-0 transition-transform ${isOpen ? "rotate-180" : ""}`} />
        </button>
      </div>

      {isOpen && (
        <div className="px-5 pb-5 pt-1 fade-in space-y-4">
          <div className="rounded-2xl bg-card border border-border/60 px-5 py-4 flex items-baseline justify-between gap-4">
            <div>
              <div className="text-[10px] uppercase tracking-widest text-muted-foreground">Your share</div>
              <div className="font-display text-2xl tabular-nums mt-1">
                {format(getMyAmount(expense), expense.currency)}
              </div>
              {converted && (
                <div className="text-[10px] text-muted-foreground tabular-nums mt-1">
                  converted from {formatNative(getMyAmount(expense), expense.currency)}
                </div>
              )}
            </div>
            <div className="text-right">
              <div className="text-[10px] uppercase tracking-widest text-muted-foreground">Total bill</div>
              <div className="text-sm text-muted-foreground tabular-nums mt-1">
                {format(expense.total_amount, expense.currency)}
              </div>
              {converted && (
                <div className="text-[10px] text-muted-foreground tabular-nums mt-0.5">
                  from {formatNative(expense.total_amount, expense.currency)}
                </div>
              )}
            </div>
          </div>
          <div className="rounded-2xl bg-secondary/50 p-5 grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <div className="text-[10px] uppercase tracking-widest text-muted-foreground mb-3">Items</div>
              {items.length === 0 ? (
                <div className="text-xs text-muted-foreground italic">No itemized breakdown.</div>
              ) : (
                <ul className="space-y-2">
                  {items.map((i) => (
                    <li key={i.id} className="flex items-center justify-between text-sm">
                      <span className="text-foreground/80">
                        {i.item_name} {i.assigned_to && <span className="text-xs text-muted-foreground">· {i.assigned_to}</span>}
                      </span>
                      <span className="tabular-nums text-foreground/70">{format(i.amount, expense.currency)}</span>
                    </li>
                  ))}
                </ul>
              )}
              {expense.notes && (
                <div className="mt-5 text-xs text-muted-foreground italic">"{expense.notes}"</div>
              )}
            </div>
            <div>
              <div className="text-[10px] uppercase tracking-widest text-muted-foreground mb-3">
                Splits · paid by {expense.paid_by}
              </div>
              {splits.length === 0 ? (
                <div className="text-xs text-muted-foreground italic">Just you on this one.</div>
              ) : (
                <ul className="space-y-2">
                  {splits.map((s) => (
                    <li key={s.id} className="flex items-center justify-between text-sm">
                      <span className="flex items-center gap-2">
                        <span
                          className={`h-5 w-5 rounded-full inline-flex items-center justify-center ${
                            s.is_paid ? "bg-owed-soft text-owed" : "bg-owe-soft text-owe"
                          }`}
                        >
                          {s.is_paid ? <Check className="h-3 w-3" /> : <X className="h-3 w-3" />}
                        </span>
                        {s.person_name}
                      </span>
                      <span className="tabular-nums text-foreground/70">
                        {format(s.amount_owed, expense.currency)}
                      </span>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </div>
        </div>
      )}
    </li>
  );
}
