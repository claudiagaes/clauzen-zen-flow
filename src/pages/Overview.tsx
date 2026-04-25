import { useEffect, useMemo, useState } from "react";
import { getExpenses, type Expense, getCategoryMeta } from "@/lib/data";
import { MonthPicker } from "@/components/MonthPicker";
import { CategoryChip } from "@/components/CategoryChip";
import { formatMoney, formatDate, startOfMonth, endOfMonth } from "@/lib/format";
import { Card } from "@/components/ui/card";
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from "recharts";
import { Link } from "react-router-dom";
import { ArrowUpRight } from "lucide-react";

const FIRST_NAME = "Claudia";

export default function Overview() {
  const [month, setMonth] = useState(() => startOfMonth(new Date()));
  const [all, setAll] = useState<Expense[]>([]);

  useEffect(() => { getExpenses().then(setAll); }, []);

  const monthExpenses = useMemo(() => {
    const s = +startOfMonth(month);
    const e = +endOfMonth(month);
    return all.filter((x) => {
      const t = +new Date(x.date);
      return t >= s && t <= e;
    });
  }, [all, month]);

  const total = monthExpenses.reduce((acc, x) => acc + x.total_amount, 0);

  const byCat = useMemo(() => {
    const map = new Map<string, number>();
    monthExpenses.forEach((x) => map.set(x.category, (map.get(x.category) ?? 0) + x.total_amount));
    return Array.from(map.entries())
      .map(([category, amount]) => ({ category, amount, meta: getCategoryMeta(category) }))
      .sort((a, b) => b.amount - a.amount);
  }, [monthExpenses]);

  const recent = monthExpenses.slice(0, 6);

  const hour = new Date().getHours();
  const greeting = hour < 12 ? "Good morning" : hour < 18 ? "Hey" : "Good evening";

  return (
    <div className="space-y-10 pt-4 fade-in">
      {/* Greeting */}
      <section className="rise-in">
        <h1 className="font-display text-3xl md:text-4xl text-foreground">
          {greeting} {FIRST_NAME}, here's your money zen <span className="inline-block">🧘</span>
        </h1>
        <p className="text-muted-foreground mt-2">A calm look at how you spent your time and money.</p>
      </section>

      <div className="flex items-center justify-between flex-wrap gap-4">
        <MonthPicker value={month} onChange={setMonth} />
        <span className="text-xs text-muted-foreground">
          {monthExpenses.length} {monthExpenses.length === 1 ? "expense" : "expenses"} this month
        </span>
      </div>

      {/* Big number */}
      <Card className="rounded-3xl border-0 shadow-card bg-card p-8 md:p-10 rise-in" style={{ animationDelay: "60ms" }}>
        <div className="text-xs uppercase tracking-widest text-muted-foreground">Total spent</div>
        <div className="font-display text-5xl md:text-7xl mt-3 text-foreground tabular-nums">
          {formatMoney(total)}
        </div>
        <div className="mt-3 text-sm text-muted-foreground">
          Across {byCat.length} {byCat.length === 1 ? "category" : "categories"} · breathe in, breathe out.
        </div>
      </Card>

      {/* Two columns */}
      <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
        {/* Donut */}
        <Card className="rounded-3xl border-0 shadow-soft bg-card p-6 lg:col-span-2 rise-in" style={{ animationDelay: "120ms" }}>
          <div className="flex items-center justify-between mb-2">
            <h2 className="font-display text-xl">By category</h2>
          </div>
          <div className="h-64">
            {byCat.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={byCat}
                    dataKey="amount"
                    nameKey="category"
                    innerRadius={62}
                    outerRadius={92}
                    paddingAngle={3}
                    stroke="none"
                  >
                    {byCat.map((entry) => (
                      <Cell key={entry.category} fill={`hsl(var(--${entry.meta.token}))`} />
                    ))}
                  </Pie>
                  <Tooltip
                    contentStyle={{
                      borderRadius: 16,
                      border: "none",
                      background: "hsl(var(--popover))",
                      color: "hsl(var(--popover-foreground))",
                      boxShadow: "var(--shadow-card)",
                      fontSize: 12,
                    }}
                    formatter={(v: number) => formatMoney(v)}
                  />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-full flex items-center justify-center text-sm text-muted-foreground">
                No expenses this month — enjoy the calm.
              </div>
            )}
          </div>
          <div className="flex flex-wrap gap-2 mt-2">
            {byCat.slice(0, 6).map((c) => (
              <CategoryChip key={c.category} category={c.category} size="sm" />
            ))}
          </div>
        </Card>

        {/* Recent */}
        <Card className="rounded-3xl border-0 shadow-soft bg-card p-6 lg:col-span-3 rise-in" style={{ animationDelay: "180ms" }}>
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-display text-xl">Recent</h2>
            <Link
              to="/expenses"
              className="text-xs text-muted-foreground hover:text-primary inline-flex items-center gap-1 transition-colors"
            >
              See all <ArrowUpRight className="h-3 w-3" />
            </Link>
          </div>
          {recent.length === 0 && (
            <div className="text-sm text-muted-foreground py-8 text-center">Nothing logged yet.</div>
          )}
          <ul className="divide-y divide-border/60">
            {recent.map((e) => (
              <li key={e.id} className="flex items-center gap-3 py-3">
                <div
                  className="h-10 w-10 rounded-2xl flex items-center justify-center text-lg shrink-0"
                  style={{ backgroundColor: `hsl(var(--${getCategoryMeta(e.category).token}))` }}
                >
                  {getCategoryMeta(e.category).emoji}
                </div>
                <div className="min-w-0 flex-1">
                  <div className="text-sm font-medium truncate">{e.description}</div>
                  <div className="text-xs text-muted-foreground">
                    {formatDate(e.date)} {e.event_tag && <>· {e.event_tag}</>}
                  </div>
                </div>
                <div className="text-sm font-medium tabular-nums">{formatMoney(e.total_amount, e.currency)}</div>
              </li>
            ))}
          </ul>
        </Card>
      </div>
    </div>
  );
}
