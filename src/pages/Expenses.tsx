import { useEffect, useMemo, useState } from "react";
import {
  CATEGORIES,
  getCategoryMeta,
  getExpenses,
  getItemsForExpense,
  getSplitsForExpense,
  type Expense,
  type ExpenseItem,
  type ExpenseSplit,
} from "@/lib/data";
import { CategoryChip } from "@/components/CategoryChip";
import { Card } from "@/components/ui/card";
import { formatDate, formatMoney } from "@/lib/format";
import { DateFilter, type DatePresetKey, type DateRange, presetToRange } from "@/components/DateFilter";
import { ChevronDown, Check, X } from "lucide-react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

export default function Expenses() {
  const [all, setAll] = useState<Expense[]>([]);
  const [datePreset, setDatePreset] = useState<DatePresetKey>("this-month");
  const [dateRange, setDateRange] = useState<DateRange>(presetToRange("this-month"));
  const [category, setCategory] = useState<string>("all");
  const [event, setEvent] = useState<string>("all");
  const [currency, setCurrency] = useState<string>("all");
  const [openId, setOpenId] = useState<string | null>(null);

  useEffect(() => { getExpenses().then(setAll); }, []);

  const events = useMemo(
    () => Array.from(new Set(all.map((e) => e.event_tag).filter(Boolean) as string[])),
    [all],
  );
  const currencies = useMemo(() => Array.from(new Set(all.map((e) => e.currency))), [all]);

  const filtered = useMemo(() => {
    return all.filter((x) => {
      if (dateRange) {
        const t = +new Date(x.date);
        if (t < +dateRange.from || t > +dateRange.to) return false;
      }
      if (category !== "all" && x.category !== category) return false;
      if (event !== "all" && x.event_tag !== event) return false;
      if (currency !== "all" && x.currency !== currency) return false;
      return true;
    });
  }, [all, dateRange, category, event, currency]);

  return (
    <div className="space-y-8 pt-4 fade-in">
      <header>
        <h1 className="font-display text-3xl md:text-4xl">Expenses</h1>
        <p className="text-muted-foreground mt-1">Browse, filter, and breathe.</p>
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
            {filtered.length} results · {formatMoney(filtered.reduce((a, x) => a + x.total_amount, 0))}
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
              first={i === 0}
            />
          ))}
        </ul>
      </Card>
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
  expense, isOpen, onToggle, first,
}: { expense: Expense; isOpen: boolean; onToggle: () => void; first: boolean }) {
  const meta = getCategoryMeta(expense.category);
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
      <button
        onClick={onToggle}
        className="w-full flex items-center gap-4 px-5 py-4 hover:bg-secondary/40 transition-colors text-left"
      >
        <div
          className="h-11 w-11 rounded-2xl flex items-center justify-center text-lg shrink-0"
          style={{ backgroundColor: `hsl(var(--${meta.token}))` }}
        >
          {meta.emoji}
        </div>
        <div className="min-w-0 flex-1">
          <div className="text-sm font-medium truncate">{expense.description}</div>
          <div className="text-xs text-muted-foreground mt-0.5 flex items-center gap-2 flex-wrap">
            <span>{formatDate(expense.date, { month: "short", day: "numeric", year: "numeric" })}</span>
            {expense.event_tag && <><span>·</span><span className="text-foreground/70">{expense.event_tag}</span></>}
            {expense.is_shared && <><span>·</span><span className="text-primary">shared</span></>}
          </div>
        </div>
        <div className="hidden md:block"><CategoryChip category={expense.category} size="sm" /></div>
        <div className="text-sm font-medium tabular-nums w-24 text-right">
          {formatMoney(expense.total_amount, expense.currency)}
        </div>
        <ChevronDown className={`h-4 w-4 text-muted-foreground shrink-0 transition-transform ${isOpen ? "rotate-180" : ""}`} />
      </button>

      {isOpen && (
        <div className="px-5 pb-5 pt-1 fade-in">
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
                      <span className="tabular-nums text-foreground/70">{formatMoney(i.amount, expense.currency)}</span>
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
                        {formatMoney(s.amount_owed, expense.currency)}
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
