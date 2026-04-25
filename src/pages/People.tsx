import { useEffect, useMemo, useState } from "react";
import { getExpenses, getSplits, type Expense, type ExpenseSplit } from "@/lib/data";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { formatMoney } from "@/lib/format";
import { ArrowDownLeft, ArrowUpRight, Bell, Loader2 } from "lucide-react";
import { toast } from "sonner";

const ME = "Claudia";
const DEFAULT_CURRENCY = "EUR";

export default function People() {
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [splits, setSplits] = useState<ExpenseSplit[]>([]);
  const [sendingTo, setSendingTo] = useState<string | null>(null);

  const sendReminder = async (person: string, amount: number) => {
    setSendingTo(person);
    try {
      // TODO: When Lovable Cloud / Supabase is connected, replace with:
      // await supabase.from("reminder_requests").insert({
      //   person_name: person, amount_owed: amount, currency: DEFAULT_CURRENCY,
      // });
      await new Promise((r) => setTimeout(r, 500));
      toast.success(`Reminder request sent to ${person} ✅`);
    } catch (err) {
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
    // Positive = they owe me (I paid). Negative = I owe them (they paid).
    const map = new Map<string, { net: number; theyOwe: number; iOwe: number; pending: number; settled: number }>();
    const expenseById = new Map(expenses.map((e) => [e.id, e]));
    const get = (p: string) => {
      if (!map.has(p)) map.set(p, { net: 0, theyOwe: 0, iOwe: 0, pending: 0, settled: 0 });
      return map.get(p)!;
    };
    for (const s of splits) {
      const e = expenseById.get(s.expense_id);
      if (!e) continue;
      const other = e.paid_by === ME ? s.person_name : e.paid_by;
      if (s.person_name !== ME && e.paid_by !== ME) continue;
      const b = get(other);
      const sign = e.paid_by === ME ? 1 : -1;
      b.net += sign * s.amount_owed;
      if (sign > 0) b.theyOwe += s.amount_owed;
      else b.iOwe += s.amount_owed;
      if (s.is_paid) b.settled += s.amount_owed;
      else b.pending += s.amount_owed;
    }
    return Array.from(map.entries())
      .map(([person, b]) => ({ person, ...b }))
      .sort((a, b) => Math.abs(b.net) - Math.abs(a.net));
  }, [expenses, splits]);

  const totalOwedToMe = balances.filter((b) => b.net > 0).reduce((a, b) => a + b.net, 0);
  const totalIOwe = balances.filter((b) => b.net < 0).reduce((a, b) => a + Math.abs(b.net), 0);

  return (
    <div className="space-y-8 pt-4 fade-in">
      <header>
        <h1 className="font-display text-3xl md:text-4xl">People & Balances</h1>
        <p className="text-muted-foreground mt-1">No stress — just gentle accounting.</p>
      </header>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Card className="rounded-3xl border-0 shadow-soft p-6 bg-owed-soft">
          <div className="flex items-center gap-2 text-owed text-xs uppercase tracking-widest font-medium">
            <ArrowDownLeft className="h-4 w-4" /> They owe you
          </div>
          <div className="font-display text-4xl mt-2 tabular-nums text-foreground">
            {formatMoney(totalOwedToMe)}
          </div>
        </Card>
        <Card className="rounded-3xl border-0 shadow-soft p-6 bg-owe-soft">
          <div className="flex items-center gap-2 text-owe text-xs uppercase tracking-widest font-medium">
            <ArrowUpRight className="h-4 w-4" /> You owe
          </div>
          <div className="font-display text-4xl mt-2 tabular-nums text-foreground">
            {formatMoney(totalIOwe)}
          </div>
        </Card>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {balances.map((b, i) => {
          const owedToMe = b.net > 0;
          const settled = Math.abs(b.net) < 0.01;
          return (
            <Card
              key={b.person}
              className="rounded-3xl border-0 shadow-soft p-6 bg-card rise-in"
              style={{ animationDelay: `${i * 60}ms` }}
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
            </Card>
          );
        })}
        {balances.length === 0 && (
          <div className="col-span-full text-sm text-muted-foreground text-center py-12">
            No shared expenses yet — peaceful solo finances.
          </div>
        )}
      </div>
    </div>
  );
}
