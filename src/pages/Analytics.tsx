import { useEffect, useMemo, useState } from "react";
import { getCategoryMeta, getExpenses, type Expense } from "@/lib/data";
import { Card } from "@/components/ui/card";
import { formatMoney } from "@/lib/format";
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

export default function Analytics() {
  const [all, setAll] = useState<Expense[]>([]);
  useEffect(() => { getExpenses().then(setAll); }, []);

  const byMonth = useMemo(() => {
    const map = new Map<string, number>();
    for (const e of all) {
      const d = new Date(e.date);
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
      map.set(key, (map.get(key) ?? 0) + e.total_amount);
    }
    return Array.from(map.entries())
      .sort()
      .map(([key, total]) => {
        const [y, m] = key.split("-").map(Number);
        return {
          key,
          label: new Date(y, m - 1, 1).toLocaleDateString("en-US", { month: "short" }),
          total: +total.toFixed(2),
        };
      });
  }, [all]);

  const thisMonthCats = useMemo(() => {
    const now = new Date();
    const filtered = all.filter((e) => {
      const d = new Date(e.date);
      return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
    });
    const m = new Map<string, number>();
    filtered.forEach((e) => m.set(e.category, (m.get(e.category) ?? 0) + e.total_amount));
    return Array.from(m.entries())
      .map(([category, amount]) => ({ category, amount: +amount.toFixed(2), meta: getCategoryMeta(category) }))
      .sort((a, b) => b.amount - a.amount);
  }, [all]);

  const topCat = thisMonthCats[0];
  const lastTwo = byMonth.slice(-2);
  const trend = lastTwo.length === 2
    ? ((lastTwo[1].total - lastTwo[0].total) / lastTwo[0].total) * 100
    : 0;
  const avgMonthly = byMonth.length
    ? byMonth.reduce((a, x) => a + x.total, 0) / byMonth.length
    : 0;

  return (
    <div className="space-y-8 pt-4 fade-in">
      <header>
        <h1 className="font-display text-3xl md:text-4xl">Analytics</h1>
        <p className="text-muted-foreground mt-1">Patterns, gently revealed.</p>
      </header>

      {/* Insights */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {topCat && (
          <Card className="rounded-3xl border-0 shadow-soft p-6 bg-primary-soft">
            <div className="text-xs text-primary font-medium uppercase tracking-widest">Top this month</div>
            <div className="font-display text-2xl mt-2">
              {topCat.meta.emoji} {topCat.meta.key}
            </div>
            <div className="text-sm text-muted-foreground mt-1 tabular-nums">{formatMoney(topCat.amount)}</div>
          </Card>
        )}
        <Card className="rounded-3xl border-0 shadow-soft p-6 bg-secondary">
          <div className="text-xs text-foreground/70 uppercase tracking-widest font-medium">Monthly average</div>
          <div className="font-display text-3xl mt-2 tabular-nums">{formatMoney(avgMonthly)}</div>
          <div className="text-xs text-muted-foreground mt-1">across {byMonth.length} months</div>
        </Card>
        <Card className="rounded-3xl border-0 shadow-soft p-6 bg-accent">
          <div className="text-xs text-accent-foreground uppercase tracking-widest font-medium">Vs last month</div>
          <div className={`font-display text-3xl mt-2 tabular-nums ${trend > 0 ? "text-owe" : "text-owed"}`}>
            {trend > 0 ? "+" : ""}{trend.toFixed(1)}%
          </div>
          <div className="text-xs text-muted-foreground mt-1">
            {trend > 0 ? "a little more than last month — that's ok" : "calmer than last month 🌿"}
          </div>
        </Card>
      </div>

      {/* Trend */}
      <Card className="rounded-3xl border-0 shadow-soft p-6 bg-card">
        <h2 className="font-display text-xl mb-1">Monthly trend</h2>
        <p className="text-xs text-muted-foreground mb-4">How your spending breathes month to month.</p>
        <div className="h-72">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={byMonth} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
              <defs>
                <linearGradient id="trendFill" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="hsl(var(--primary))" stopOpacity={0.35} />
                  <stop offset="100%" stopColor="hsl(var(--primary))" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="2 6" stroke="hsl(var(--border))" vertical={false} />
              <XAxis dataKey="label" stroke="hsl(var(--muted-foreground))" tickLine={false} axisLine={false} fontSize={11} />
              <YAxis stroke="hsl(var(--muted-foreground))" tickLine={false} axisLine={false} fontSize={11} tickFormatter={(v) => `€${v}`} />
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
              <Area
                type="monotone"
                dataKey="total"
                stroke="hsl(var(--primary))"
                strokeWidth={2.5}
                fill="url(#trendFill)"
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </Card>

      {/* Category bars */}
      <Card className="rounded-3xl border-0 shadow-soft p-6 bg-card">
        <h2 className="font-display text-xl mb-1">Categories this month</h2>
        <p className="text-xs text-muted-foreground mb-4">Soft view of where your money flowed.</p>
        <div className="h-80">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={thisMonthCats} layout="vertical" margin={{ left: 20, right: 20 }}>
              <CartesianGrid strokeDasharray="2 6" stroke="hsl(var(--border))" horizontal={false} />
              <XAxis type="number" stroke="hsl(var(--muted-foreground))" tickLine={false} axisLine={false} fontSize={11} tickFormatter={(v) => `€${v}`} />
              <YAxis
                type="category"
                dataKey="category"
                stroke="hsl(var(--muted-foreground))"
                tickLine={false}
                axisLine={false}
                fontSize={11}
                width={120}
                tickFormatter={(v) => {
                  const m = getCategoryMeta(v);
                  return `${m.emoji}  ${m.key}`;
                }}
              />
              <Tooltip
                cursor={{ fill: "hsl(var(--secondary))", radius: 12 }}
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
              <Bar dataKey="amount" radius={[8, 8, 8, 8]}>
                {thisMonthCats.map((entry) => (
                  <Cell key={entry.category} fill={`hsl(var(--${entry.meta.token}))`} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      </Card>
    </div>
  );
}

// inline Cell import to avoid extra dep declaration
import { Cell } from "recharts";
