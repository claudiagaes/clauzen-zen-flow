import { useEffect, useMemo, useState } from "react";
import { getCategoryMeta, getExpenses, type Expense } from "@/lib/data";
import { getEventFlag } from "@/lib/eventIcon";
import { Card } from "@/components/ui/card";
import { formatDate, formatMoney } from "@/lib/format";
import { CategoryChip } from "@/components/CategoryChip";
import { ChevronLeft, MapPin } from "lucide-react";
import { Button } from "@/components/ui/button";

interface EventGroup {
  name: string;
  expenses: Expense[];
  total: number;
  start: string;
  end: string;
  topCategory: string;
}

export default function Trips() {
  const [all, setAll] = useState<Expense[]>([]);
  const [selected, setSelected] = useState<string | null>(null);

  useEffect(() => { getExpenses().then(setAll); }, []);

  const events: EventGroup[] = useMemo(() => {
    const groups = new Map<string, Expense[]>();
    for (const e of all) {
      if (!e.event_tag) continue;
      if (!groups.has(e.event_tag)) groups.set(e.event_tag, []);
      groups.get(e.event_tag)!.push(e);
    }
    return Array.from(groups.entries()).map(([name, list]) => {
      const sorted = [...list].sort((a, b) => +new Date(a.date) - +new Date(b.date));
      const total = list.reduce((a, x) => a + x.total_amount, 0);
      const catTotals = new Map<string, number>();
      list.forEach((x) => catTotals.set(x.category, (catTotals.get(x.category) ?? 0) + x.total_amount));
      const topCategory = Array.from(catTotals.entries()).sort((a, b) => b[1] - a[1])[0][0];
      return {
        name,
        expenses: list,
        total,
        start: sorted[0].date,
        end: sorted[sorted.length - 1].date,
        topCategory,
      };
    }).sort((a, b) => +new Date(b.start) - +new Date(a.start));
  }, [all]);

  if (selected) {
    const ev = events.find((e) => e.name === selected);
    if (!ev) return null;
    return <TripDetail event={ev} onBack={() => setSelected(null)} />;
  }

  return (
    <div className="space-y-8 pt-4 fade-in">
      <header>
        <h1 className="font-display text-3xl md:text-4xl">Trips & Events</h1>
        <p className="text-muted-foreground mt-1">Memories, gathered.</p>
      </header>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
        {events.map((ev, i) => {
          const meta = getCategoryMeta(ev.topCategory);
          return (
            <button
              key={ev.name}
              onClick={() => setSelected(ev.name)}
              className="text-left group rise-in"
              style={{ animationDelay: `${i * 60}ms` }}
            >
              <Card className="rounded-3xl border-0 shadow-soft hover:shadow-glow transition-all duration-500 bg-card overflow-hidden h-full">
                <div
                  className="h-28 flex items-end p-5 relative"
                  style={{ backgroundColor: `hsl(var(--${meta.token}))` }}
                >
                  <div className="text-4xl absolute top-4 right-4 opacity-90">{meta.emoji}</div>
                  <MapPin className="h-4 w-4 text-foreground/50" />
                </div>
                <div className="p-5">
                  <div className="font-display text-xl">{ev.name}</div>
                  <div className="text-xs text-muted-foreground mt-1">
                    {formatDate(ev.start)} – {formatDate(ev.end, { month: "short", day: "numeric", year: "numeric" })}
                  </div>
                  <div className="mt-4 flex items-end justify-between">
                    <div>
                      <div className="text-[10px] uppercase tracking-widest text-muted-foreground">Total</div>
                      <div className="font-display text-2xl tabular-nums">{formatMoney(ev.total)}</div>
                    </div>
                    <CategoryChip category={ev.topCategory} size="sm" />
                  </div>
                </div>
              </Card>
            </button>
          );
        })}
        {events.length === 0 && (
          <div className="col-span-full text-sm text-muted-foreground text-center py-12">
            No tagged events yet.
          </div>
        )}
      </div>
    </div>
  );
}

function TripDetail({ event, onBack }: { event: EventGroup; onBack: () => void }) {
  const byCat = useMemo(() => {
    const m = new Map<string, number>();
    event.expenses.forEach((e) => m.set(e.category, (m.get(e.category) ?? 0) + e.total_amount));
    return Array.from(m.entries()).sort((a, b) => b[1] - a[1]);
  }, [event]);

  return (
    <div className="space-y-8 pt-4 fade-in">
      <Button variant="ghost" onClick={onBack} className="rounded-2xl -ml-3 text-muted-foreground hover:text-foreground hover:bg-secondary gap-1">
        <ChevronLeft className="h-4 w-4" /> All trips
      </Button>

      <header>
        <div className="text-xs uppercase tracking-widest text-muted-foreground">Event</div>
        <h1 className="font-display text-4xl mt-1">{event.name}</h1>
        <p className="text-muted-foreground mt-1">
          {formatDate(event.start)} – {formatDate(event.end, { month: "short", day: "numeric", year: "numeric" })} · {event.expenses.length} expenses
        </p>
      </header>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="rounded-3xl border-0 shadow-soft p-6 bg-card md:col-span-1">
          <div className="text-[10px] uppercase tracking-widest text-muted-foreground">Total</div>
          <div className="font-display text-4xl mt-2 tabular-nums">{formatMoney(event.total)}</div>
        </Card>
        <Card className="rounded-3xl border-0 shadow-soft p-6 bg-card md:col-span-2">
          <div className="text-[10px] uppercase tracking-widest text-muted-foreground mb-3">Breakdown</div>
          <div className="space-y-2">
            {byCat.map(([cat, amount]) => {
              const pct = (amount / event.total) * 100;
              const meta = getCategoryMeta(cat);
              return (
                <div key={cat}>
                  <div className="flex items-center justify-between text-xs mb-1">
                    <span className="text-foreground/80">{meta.emoji} {cat}</span>
                    <span className="tabular-nums text-muted-foreground">{formatMoney(amount)}</span>
                  </div>
                  <div className="h-2 rounded-full bg-secondary overflow-hidden">
                    <div
                      className="h-full rounded-full transition-all duration-700"
                      style={{ width: `${pct}%`, backgroundColor: `hsl(var(--${meta.token}))`, filter: "saturate(1.4) brightness(0.92)" }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </Card>
      </div>

      <Card className="rounded-3xl border-0 shadow-soft bg-card overflow-hidden">
        <ul>
          {event.expenses.map((e, i) => {
            const meta = getCategoryMeta(e.category);
            return (
              <li key={e.id} className={`flex items-center gap-4 px-5 py-4 ${i === 0 ? "" : "border-t border-border/50"}`}>
                <div
                  className="h-11 w-11 rounded-2xl flex items-center justify-center text-lg shrink-0"
                  style={{ backgroundColor: `hsl(var(--${meta.token}))` }}
                >
                  {meta.emoji}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-medium truncate">{e.description}</div>
                  <div className="text-xs text-muted-foreground">{formatDate(e.date)} · paid by {e.paid_by}</div>
                </div>
                <div className="text-sm font-medium tabular-nums">{formatMoney(e.total_amount, e.currency)}</div>
              </li>
            );
          })}
        </ul>
      </Card>
    </div>
  );
}
