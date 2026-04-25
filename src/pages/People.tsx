import { useEffect, useMemo, useState } from "react";
import {
  getExpenses,
  getSplits,
  getCategoryMeta,
  getItemsForExpense,
  type Expense,
  type ExpenseSplit,
  type ExpenseItem,
} from "@/lib/data";
import { supabase } from "@/lib/supabase";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { formatDate, DISPLAY_CURRENCY } from "@/lib/format";
import { useCurrency } from "@/contexts/CurrencyContext";
import { ArrowDownLeft, ArrowUpRight, Bell, ChevronDown, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

const ME = "Claudia";

type FilterMode = "all" | "they-owe" | "i-owe";

export default function People() {
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [splits, setSplits] = useState<ExpenseSplit[]>([]);
  const [sendingTo, setSendingTo] = useState<string | null>(null);
  const [filter, setFilter] = useState<FilterMode>("all");
  const [selectedPerson, setSelectedPerson] = useState<string | null>(null);
  const [expandedExpenseId, setExpandedExpenseId] = useState<string | null>(null);
  const [itemsByExpense, setItemsByExpense] = useState<Record<string, ExpenseItem[]>>({});
  const [loadingItemsFor, setLoadingItemsFor] = useState<string | null>(null);
  const { format, convert } = useCurrency();

  const toggleExpenseItems = async (expenseId: string) => {
    if (expandedExpenseId === expenseId) {
      setExpandedExpenseId(null);
      return;
    }
    setExpandedExpenseId(expenseId);
    if (!itemsByExpense[expenseId]) {
      setLoadingItemsFor(expenseId);
      try {
        const items = await getItemsForExpense(expenseId);
        setItemsByExpense((prev) => ({ ...prev, [expenseId]: items }));
      } catch (err) {
        console.error("getItemsForExpense failed", err);
      } finally {
        setLoadingItemsFor(null);
      }
    }
  };

  const sendReminder = async (person: string, amount: number) => {
    setSendingTo(person);
    try {
      const { error } = await supabase.from("reminder_requests").insert({
        person_name: person,
        amount_owed: amount,
        currency: DISPLAY_CURRENCY,
      });
      if (error) throw error;
      toast.success(`Reminder request sent to ${person} ✅`);
    } catch (err) {
      console.error("reminder insert failed", err);
      toast.error("Couldn't send reminder. Try again.");
    } finally {
      setSendingTo(null);
    }
  };

  useEffect(() => {
    getExpenses().then(setExpenses);
    getSplits().then(setSplits);
  }, []);

  const balances = useMemo(() => {
    // net = unpaid only. Positive = they owe me. Negative = I owe them.
    // theyOwe / iOwe also count only unpaid (open) amounts.
    // settled tracks paid amounts for display.
    const map = new Map<
      string,
      { net: number; theyOwe: number; iOwe: number; pending: number; settled: number }
    >();
    const expenseById = new Map(expenses.map((e) => [e.id, e]));
    const get = (p: string) => {
      if (!map.has(p)) map.set(p, { net: 0, theyOwe: 0, iOwe: 0, pending: 0, settled: 0 });
      return map.get(p)!;
    };
    // Direction convention:
    // - If `person_name` starts with "[You owe]", the split represents money I owe that person
    //   (regardless of who is recorded as `paid_by` — used for imported balance summaries).
    // - Otherwise, the standard rule applies: if I paid, they owe me; if they paid, I owe them.
    const OWE_PREFIX_RE = /^\s*\[you owe\]\s*/i;
    for (const s of splits) {
      const e = expenseById.get(s.expense_id);
      if (!e) continue;
      const hasOwePrefix = OWE_PREFIX_RE.test(s.person_name);
      const cleanName = s.person_name.replace(OWE_PREFIX_RE, "").trim();
      // Only relate splits where I am one of the two sides (or it's a tagged balance row).
      if (!hasOwePrefix && cleanName !== ME && e.paid_by !== ME) continue;
      const other = hasOwePrefix
        ? cleanName
        : e.paid_by === ME
          ? cleanName
          : e.paid_by;
      if (other === ME) continue;
      const b = get(other);
      const amount = toDisplayAmount(s.amount_owed, e.currency);

      // Determine direction.
      const iOweThem = hasOwePrefix ? true : e.paid_by !== ME;

      if (s.is_paid) {
        // Paid → already settled; do NOT add to net or open balances.
        b.settled += amount;
      } else {
        b.pending += amount;
        if (iOweThem) {
          b.net -= amount;
          b.iOwe += amount;
        } else {
          b.net += amount;
          b.theyOwe += amount;
        }
      }
    }
    return Array.from(map.entries())
      .map(([person, b]) => ({ person, ...b }))
      // Hide people with no meaningful activity (net ≈ 0 AND nothing pending or settled).
      .filter(
        (b) =>
          Math.abs(b.net) > 0.005 ||
          b.pending > 0.005 ||
          b.settled > 0.005,
      )
      .sort((a, b) => Math.abs(b.net) - Math.abs(a.net));
  }, [expenses, splits]);

  const totalOwedToMe = balances.filter((b) => b.net > 0.005).reduce((a, b) => a + b.net, 0);
  const totalIOwe = balances.filter((b) => b.net < -0.005).reduce((a, b) => a + Math.abs(b.net), 0);

  const visibleBalances = useMemo(() => {
    if (filter === "they-owe") return balances.filter((b) => b.net > 0.005);
    if (filter === "i-owe") return balances.filter((b) => b.net < -0.005);
    return balances;
  }, [balances, filter]);

  // Per-person expense breakdown for the detail dialog.
  const personDetails = useMemo(() => {
    if (!selectedPerson) return null;
    const expenseById = new Map(expenses.map((e) => [e.id, e]));
    const OWE_PREFIX_RE = /^\s*\[you owe\]\s*/i;
    type Row = {
      id: string;
      expense_id: string;
      date: string;
      description: string;
      category: string;
      amount: number; // in display currency
      direction: "they-owe" | "i-owe";
      is_paid: boolean;
    };
    const rows: Row[] = [];
    for (const s of splits) {
      const e = expenseById.get(s.expense_id);
      if (!e) continue;
      const hasOwePrefix = OWE_PREFIX_RE.test(s.person_name);
      const cleanName = s.person_name.replace(OWE_PREFIX_RE, "").trim();
      if (!hasOwePrefix && cleanName !== ME && e.paid_by !== ME) continue;
      const other = hasOwePrefix ? cleanName : e.paid_by === ME ? cleanName : e.paid_by;
      if (other !== selectedPerson) continue;
      const iOweThem = hasOwePrefix ? true : e.paid_by !== ME;
      rows.push({
        id: s.id,
        expense_id: s.expense_id,
        date: e.date,
        description: e.description,
        category: e.category,
        amount: toDisplayAmount(s.amount_owed, e.currency),
        direction: iOweThem ? "i-owe" : "they-owe",
        is_paid: s.is_paid,
      });
    }
    rows.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
    const open = rows.filter((r) => !r.is_paid);
    const settled = rows.filter((r) => r.is_paid);
    return { rows, open, settled };
  }, [selectedPerson, expenses, splits]);

  const selectedBalance = selectedPerson
    ? balances.find((b) => b.person === selectedPerson)
    : null;

  return (
    <div className="space-y-8 pt-4 fade-in">
      <header>
        <h1 className="font-display text-3xl md:text-4xl">People & Balances</h1>
        <p className="text-muted-foreground mt-1">No stress — just gentle accounting.</p>
      </header>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <button
          type="button"
          onClick={() => setFilter(filter === "they-owe" ? "all" : "they-owe")}
          aria-pressed={filter === "they-owe"}
          className={cn(
            "text-left rounded-3xl transition-all focus:outline-none focus-visible:ring-2 focus-visible:ring-ring",
            filter === "they-owe" ? "ring-2 ring-owed scale-[1.01]" : "hover:scale-[1.005]",
          )}
        >
          <Card className="rounded-3xl border-0 shadow-soft p-6 bg-owed-soft">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-owed text-xs uppercase tracking-widest font-medium">
                <ArrowDownLeft className="h-4 w-4" /> They owe you
              </div>
              <span className="text-[10px] uppercase tracking-widest text-owed/70">
                {filter === "they-owe" ? "Filtering" : "Tap to filter"}
              </span>
            </div>
            <div className="font-display text-4xl mt-2 tabular-nums text-foreground">
              {formatMoney(totalOwedToMe)}
            </div>
          </Card>
        </button>

        <button
          type="button"
          onClick={() => setFilter(filter === "i-owe" ? "all" : "i-owe")}
          aria-pressed={filter === "i-owe"}
          className={cn(
            "text-left rounded-3xl transition-all focus:outline-none focus-visible:ring-2 focus-visible:ring-ring",
            filter === "i-owe" ? "ring-2 ring-owe scale-[1.01]" : "hover:scale-[1.005]",
          )}
        >
          <Card className="rounded-3xl border-0 shadow-soft p-6 bg-owe-soft">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-owe text-xs uppercase tracking-widest font-medium">
                <ArrowUpRight className="h-4 w-4" /> You owe
              </div>
              <span className="text-[10px] uppercase tracking-widest text-owe/70">
                {filter === "i-owe" ? "Filtering" : "Tap to filter"}
              </span>
            </div>
            <div className="font-display text-4xl mt-2 tabular-nums text-foreground">
              {formatMoney(totalIOwe)}
            </div>
          </Card>
        </button>
      </div>

      {filter !== "all" && (
        <div className="flex items-center justify-between -mt-4">
          <span className="text-xs text-muted-foreground">
            Showing {filter === "they-owe" ? "people who owe you" : "people you owe"}
          </span>
          <button
            onClick={() => setFilter("all")}
            className="text-xs text-muted-foreground hover:text-foreground"
          >
            Clear filter
          </button>
        </div>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {visibleBalances.map((b, i) => {
          const owedToMe = b.net > 0.005;
          const settled = Math.abs(b.net) < 0.005;
          return (
            <Card
              key={b.person}
              className="rounded-3xl border-0 shadow-soft p-6 bg-card rise-in"
              style={{ animationDelay: `${i * 60}ms` }}
            >
              <button
                type="button"
                onClick={() => setSelectedPerson(b.person)}
                className="block w-full text-left -m-6 p-6 rounded-3xl transition-colors hover:bg-foreground/[0.02] focus:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                aria-label={`View expenses with ${b.person}`}
              >
                <div className="flex items-center gap-3">
                  <div className="h-12 w-12 rounded-2xl bg-secondary flex items-center justify-center font-display text-lg text-foreground">
                    {b.person[0]}
                  </div>
                  <div className="min-w-0">
                    <div className="font-medium truncate">{b.person}</div>
                    <div className="text-xs text-muted-foreground">
                      {settled ? "All settled" : owedToMe ? "owes you" : "you owe"}
                    </div>
                  </div>
                </div>
                <div className="mt-5">
                  <div
                    className={`font-display text-3xl tabular-nums ${
                      settled ? "text-muted-foreground" : owedToMe ? "text-owed" : "text-owe"
                    }`}
                  >
                    {settled ? formatMoney(0) : formatMoney(Math.abs(b.net))}
                  </div>
                </div>
                <div className="mt-4 pt-4 border-t border-border/50 flex items-center justify-between text-xs text-muted-foreground">
                  <span>Pending {formatMoney(b.pending)}</span>
                  <span>Settled {formatMoney(b.settled)}</span>
                </div>
              </button>
              {owedToMe && !settled && (
                <Button
                  onClick={() => sendReminder(b.person, b.net)}
                  disabled={sendingTo === b.person}
                  className="mt-4 w-full rounded-2xl bg-owed-soft text-owed hover:bg-owed-soft/80 border-0 shadow-none"
                  variant="secondary"
                >
                  {sendingTo === b.person ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" /> Sending…
                    </>
                  ) : (
                    <>
                      <Bell className="h-4 w-4" /> Send Reminder 🔔
                    </>
                  )}
                </Button>
              )}
            </Card>
          );
        })}
        {visibleBalances.length === 0 && (
          <div className="col-span-full text-sm text-muted-foreground text-center py-12">
            {filter === "all"
              ? "No shared expenses yet — peaceful solo finances."
              : filter === "they-owe"
                ? "Nobody owes you right now 🎉"
                : "You don't owe anyone right now ✨"}
          </div>
        )}
      </div>

      <Dialog
        open={!!selectedPerson}
        onOpenChange={(open) => {
          if (!open) {
            setSelectedPerson(null);
            setExpandedExpenseId(null);
          }
        }}
      >
        <DialogContent className="rounded-3xl border-0 shadow-soft max-w-2xl max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <div className="flex items-center gap-3">
              <div className="h-12 w-12 rounded-2xl bg-secondary flex items-center justify-center font-display text-lg text-foreground">
                {selectedPerson?.[0]}
              </div>
              <div>
                <DialogTitle className="font-display text-2xl">{selectedPerson}</DialogTitle>
                <DialogDescription>
                  {selectedBalance
                    ? Math.abs(selectedBalance.net) < 0.005
                      ? "All settled ✨"
                      : selectedBalance.net > 0
                        ? `Owes you ${formatMoney(selectedBalance.net)}`
                        : `You owe ${formatMoney(Math.abs(selectedBalance.net))}`
                    : ""}
                </DialogDescription>
              </div>
            </div>
          </DialogHeader>

          {personDetails && (
            <div className="space-y-6 mt-2">
              {personDetails.open.length > 0 && (
                <section>
                  <h3 className="text-xs uppercase tracking-widest text-muted-foreground font-medium mb-3">
                    Open expenses
                  </h3>
                  <ul className="space-y-2">
                    {personDetails.open.map((r) => {
                      const meta = getCategoryMeta(r.category);
                      const owedToMe = r.direction === "they-owe";
                      const isExpanded = expandedExpenseId === r.expense_id;
                      const items = itemsByExpense[r.expense_id];
                      const isLoading = loadingItemsFor === r.expense_id;
                      // Items relevant to this person: assigned to them, assigned to ME (still split), or unassigned (shared).
                      const relevantItems = items
                        ? items.filter(
                            (it) =>
                              !it.assigned_to ||
                              it.assigned_to === selectedPerson ||
                              it.assigned_to === ME,
                          )
                        : [];
                      return (
                        <li key={r.id} className="rounded-2xl bg-secondary/50 overflow-hidden">
                          <button
                            type="button"
                            onClick={() => toggleExpenseItems(r.expense_id)}
                            className="w-full flex items-center gap-3 p-3 text-left hover:bg-secondary/70 transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-ring rounded-2xl"
                            aria-expanded={isExpanded}
                          >
                            <div className="h-10 w-10 rounded-xl bg-background flex items-center justify-center text-lg">
                              {meta.emoji}
                            </div>
                            <div className="min-w-0 flex-1">
                              <div className="font-medium truncate">{r.description}</div>
                              <div className="text-xs text-muted-foreground">
                                {formatDate(r.date)} · {r.category}
                              </div>
                            </div>
                            <div
                              className={`font-display text-lg tabular-nums ${
                                owedToMe ? "text-owed" : "text-owe"
                              }`}
                            >
                              {owedToMe ? "+" : "−"}
                              {formatMoney(r.amount)}
                            </div>
                            <ChevronDown
                              className={cn(
                                "h-4 w-4 text-muted-foreground transition-transform",
                                isExpanded && "rotate-180",
                              )}
                            />
                          </button>
                          {isExpanded && (
                            <div className="px-3 pb-3 pt-1 border-t border-border/40 bg-background/40">
                              {isLoading ? (
                                <div className="flex items-center gap-2 text-xs text-muted-foreground py-3">
                                  <Loader2 className="h-3 w-3 animate-spin" /> Loading items…
                                </div>
                              ) : relevantItems.length > 0 ? (
                                <ul className="space-y-1.5 mt-2">
                                  {relevantItems.map((it) => (
                                    <li
                                      key={it.id}
                                      className="flex items-center justify-between text-sm py-1"
                                    >
                                      <div className="min-w-0 flex-1">
                                        <span className="truncate">{it.item_name}</span>
                                        {it.assigned_to && (
                                          <span className="ml-2 text-[10px] uppercase tracking-wider text-muted-foreground">
                                            {it.assigned_to === ME ? "you" : it.assigned_to}
                                          </span>
                                        )}
                                      </div>
                                      <span className="tabular-nums text-muted-foreground">
                                        {formatMoney(toDisplayAmount(it.amount, expenses.find((e) => e.id === r.expense_id)?.currency ?? "USD"))}
                                      </span>
                                    </li>
                                  ))}
                                </ul>
                              ) : (
                                <div className="text-xs text-muted-foreground py-3">
                                  No itemized breakdown for this expense.
                                </div>
                              )}
                            </div>
                          )}
                        </li>
                      );
                    })}
                  </ul>
                </section>
              )}

              {personDetails.settled.length > 0 && (
                <section>
                  <h3 className="text-xs uppercase tracking-widest text-muted-foreground font-medium mb-3">
                    Settled
                  </h3>
                  <ul className="space-y-2">
                    {personDetails.settled.map((r) => {
                      const meta = getCategoryMeta(r.category);
                      return (
                        <li
                          key={r.id}
                          className="flex items-center gap-3 p-3 rounded-2xl bg-secondary/30 opacity-70"
                        >
                          <div className="h-10 w-10 rounded-xl bg-background flex items-center justify-center text-lg">
                            {meta.emoji}
                          </div>
                          <div className="min-w-0 flex-1">
                            <div className="font-medium truncate line-through decoration-muted-foreground/50">
                              {r.description}
                            </div>
                            <div className="text-xs text-muted-foreground">
                              {formatDate(r.date)} · {r.category}
                            </div>
                          </div>
                          <div className="font-display text-sm tabular-nums text-muted-foreground">
                            {formatMoney(r.amount)}
                          </div>
                        </li>
                      );
                    })}
                  </ul>
                </section>
              )}

              {personDetails.rows.length === 0 && (
                <div className="text-sm text-muted-foreground text-center py-8">
                  No expenses found.
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
