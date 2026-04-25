import { useEffect, useMemo, useState } from "react";
import { getCategoryMeta, getExpenses, CATEGORIES, type Expense } from "@/lib/data";
import { Card } from "@/components/ui/card";
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { cn } from "@/lib/utils";
import { ExpenseChat } from "@/components/ExpenseChat";

type CurrencyCode = "USD" | "EUR" | "MXN";
const CURRENCIES: { code: CurrencyCode; symbol: string; label: string }[] = [
  { code: "USD", symbol: "$", label: "USD" },
  { code: "EUR", symbol: "€", label: "EUR" },
  { code: "MXN", symbol: "MX$", label: "MXN" },
];

type DateRangeKey = "this-month" | "last-3" | "this-year" | "all";
const DATE_RANGES: { key: DateRangeKey; label: string }[] = [
  { key: "this-month", label: "This month" },
  { key: "last-3", label: "Last 3 months" },
  { key: "this-year", label: "This year" },
  { key: "all", label: "All time" },
];

function formatInCurrency(amount: number, code: CurrencyCode) {
  const sym = CURRENCIES.find((c) => c.code === code)?.symbol ?? "";
  const rounded = amount % 1 === 0 ? amount.toFixed(0) : amount.toFixed(2);
  return `${sym}${Number(rounded).toLocaleString("en-US", {
    maximumFractionDigits: 2,
  })}`;
}

function inDateRange(iso: string, range: DateRangeKey) {
  if (range === "all") return true;
  const d = new Date(iso);
  const now = new Date();
  if (range === "this-month") {
    return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
  }
  if (range === "this-year") {
    return d.getFullYear() === now.getFullYear();
  }
  if (range === "last-3") {
    const cutoff = new Date(now.getFullYear(), now.getMonth() - 2, 1);
    return d >= cutoff;
  }
  return true;
}

export default function Analytics() {
  const [all, setAll] = useState<Expense[]>([]);
  const [currency, setCurrency] = useState<CurrencyCode>("USD");
  const [category, setCategory] = useState<string>("all");
  const [dateRange, setDateRange] = useState<DateRangeKey>("this-year");

  useEffect(() => {
    getExpenses().then(setAll);
  }, []);

  // Step 1: filter by currency + date range (used for charts/insights)
  const scoped = useMemo(
    () =>
      all.filter(
        (e) =>
          (e.currency as string) === currency &&
          inDateRange(e.date, dateRange) &&
          e.total_amount > 0.001,
      ),
    [all, currency, dateRange],
  );

  // Categories present in the scope (so the filter row is meaningful)
  const availableCategories = useMemo(() => {
    const set = new Set<string>();
    scoped.forEach((e) => set.add(e.category));
    return CATEGORIES.filter((c) => set.has(c.key));
  }, [scoped]);

  // Step 2: apply category filter for trend + stats
  const filtered = useMemo(
    () => (category === "all" ? scoped : scoped.filter((e) => e.category === category)),
    [scoped, category],
  );

  // Monthly totals (only months with data)
  const byMonth = useMemo(() => {
    const map = new Map<string, number>();
    for (const e of filtered) {
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
  }, [filtered]);

  // Categories in current month within scope (for the bar chart — always all cats)
  const thisMonthCats = useMemo(() => {
    const now = new Date();
    const inMonth = scoped.filter((e) => {
      const d = new Date(e.date);
      return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
    });
    const m = new Map<string, number>();
    inMonth.forEach((e) => m.set(e.category, (m.get(e.category) ?? 0) + e.total_amount));
    return Array.from(m.entries())
      .map(([cat, amount]) => ({
        category: cat,
        amount: +amount.toFixed(2),
        meta: getCategoryMeta(cat),
      }))
      .sort((a, b) => b.amount - a.amount);
  }, [scoped]);

  // Stats
  const topCat = thisMonthCats[0];
  const lastTwo = byMonth.slice(-2);
  const trend =
    lastTwo.length === 2 && lastTwo[0].total > 0
      ? ((lastTwo[1].total - lastTwo[0].total) / lastTwo[0].total) * 100
      : 0;
  const avgMonthly = byMonth.length
    ? byMonth.reduce((a, x) => a + x.total, 0) / byMonth.length
    : 0;

  // Smart insights
  const insights = useMemo(() => {
    const now = new Date();
    const monthExpenses = filtered.filter((e) => {
      const d = new Date(e.date);
      return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
    });
    const monthTotal = monthExpenses.reduce((a, e) => a + e.total_amount, 0);

    // Top category this month (within filter)
    const catMap = new Map<string, number>();
    monthExpenses.forEach((e) =>
      catMap.set(e.category, (catMap.get(e.category) ?? 0) + e.total_amount),
    );
    const topThisMonth = Array.from(catMap.entries()).sort((a, b) => b[1] - a[1])[0];

    // Compare to last month
    const lm = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    const lastMonthTotal = filtered
      .filter((e) => {
        const d = new Date(e.date);
        return d.getMonth() === lm.getMonth() && d.getFullYear() === lm.getFullYear();
      })
      .reduce((a, e) => a + e.total_amount, 0);

    const pctDelta =
      lastMonthTotal > 0 ? ((monthTotal - lastMonthTotal) / lastMonthTotal) * 100 : null;

    // Biggest single expense in scope
    const biggest = [...filtered].sort((a, b) => b.total_amount - a.total_amount)[0];

    // If a trip/event tag is being indirectly highlighted via category? Skip — show trip rollups
    // Group by event_tag in scope to see if there's a notable trip
    const tripMap = new Map<string, { total: number; count: number }>();
    filtered.forEach((e) => {
      if (!e.event_tag) return;
      const cur = tripMap.get(e.event_tag) ?? { total: 0, count: 0 };
      cur.total += e.total_amount;
      cur.count += 1;
      tripMap.set(e.event_tag, cur);
    });
    const topTrip = Array.from(tripMap.entries()).sort((a, b) => b[1].total - a[1].total)[0];

    return { topThisMonth, pctDelta, biggest, topTrip, monthTotal };
  }, [filtered]);

  return (
    <div className="space-y-8 pt-4 fade-in">
      <header className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="font-display text-3xl md:text-4xl">Analytics</h1>
          <p className="text-muted-foreground mt-1">Patterns, gently revealed.</p>
        </div>

        {/* Currency selector */}
        <div className="inline-flex items-center gap-1 bg-secondary rounded-2xl p-1">
          {CURRENCIES.map((c) => (
            <button
              key={c.code}
              onClick={() => setCurrency(c.code)}
              className={cn(
                "px-3 py-1.5 text-xs rounded-xl transition-colors font-medium",
                currency === c.code
                  ? "bg-card text-foreground shadow-soft"
                  : "text-muted-foreground hover:text-foreground",
              )}
            >
              {c.symbol} {c.label}
            </button>
          ))}
        </div>
      </header>

      {/* Date range filter */}
      <div className="inline-flex flex-wrap items-center gap-1 bg-secondary rounded-2xl p-1">
        {DATE_RANGES.map((r) => (
          <button
            key={r.key}
            onClick={() => setDateRange(r.key)}
            className={cn(
              "px-3 py-1.5 text-xs rounded-xl transition-colors",
              dateRange === r.key
                ? "bg-card text-foreground shadow-soft"
                : "text-muted-foreground hover:text-foreground",
            )}
          >
            {r.label}
          </button>
        ))}
      </div>

      {/* Insights cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {topCat ? (
          <Card className="rounded-3xl border-0 shadow-soft p-6 bg-primary-soft">
            <div className="text-xs text-primary font-medium uppercase tracking-widest">
              Top this month
            </div>
            <div className="font-display text-2xl mt-2">
              {topCat.meta.emoji} {topCat.meta.key}
            </div>
            <div className="text-sm text-muted-foreground mt-1 tabular-nums">
              {formatInCurrency(topCat.amount, currency)}
            </div>
          </Card>
        ) : (
          <Card className="rounded-3xl border-0 shadow-soft p-6 bg-primary-soft">
            <div className="text-xs text-primary font-medium uppercase tracking-widest">
              Top this month
            </div>
            <div className="font-display text-2xl mt-2 text-muted-foreground">No data</div>
          </Card>
        )}
        <Card className="rounded-3xl border-0 shadow-soft p-6 bg-secondary">
          <div className="text-xs text-foreground/70 uppercase tracking-widest font-medium">
            Monthly average
          </div>
          <div className="font-display text-3xl mt-2 tabular-nums">
            {formatInCurrency(avgMonthly, currency)}
          </div>
          <div className="text-xs text-muted-foreground mt-1">
            across {byMonth.length} {byMonth.length === 1 ? "month" : "months"} with data
          </div>
        </Card>
        <Card className="rounded-3xl border-0 shadow-soft p-6 bg-accent">
          <div className="text-xs text-accent-foreground uppercase tracking-widest font-medium">
            Vs last month
          </div>
          <div
            className={`font-display text-3xl mt-2 tabular-nums ${trend > 0 ? "text-owe" : "text-owed"}`}
          >
            {trend > 0 ? "+" : ""}
            {trend.toFixed(1)}%
          </div>
          <div className="text-xs text-muted-foreground mt-1">
            {trend > 0
              ? "a little more than last month — that's ok"
              : "calmer than last month 🌿"}
          </div>
        </Card>
      </div>

      {/* Category filter row */}
      <div className="space-y-2">
        <div className="text-xs text-muted-foreground uppercase tracking-widest font-medium">
          Filter by category
        </div>
        <div className="flex flex-wrap gap-2">
          <button
            onClick={() => setCategory("all")}
            className={cn(
              "px-3 py-1.5 text-xs rounded-2xl transition-colors",
              category === "all"
                ? "bg-foreground text-background"
                : "bg-secondary text-muted-foreground hover:text-foreground",
            )}
          >
            All categories
          </button>
          {availableCategories.map((c) => (
            <button
              key={c.key}
              onClick={() => setCategory(c.key)}
              className={cn(
                "px-3 py-1.5 text-xs rounded-2xl transition-colors inline-flex items-center gap-1.5",
                category === c.key
                  ? "bg-foreground text-background"
                  : "bg-secondary text-muted-foreground hover:text-foreground",
              )}
            >
              <span>{c.emoji}</span>
              <span>{c.key}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Trend */}
      <Card className="rounded-3xl border-0 shadow-soft p-6 bg-card">
        <h2 className="font-display text-xl mb-1">
          Monthly trend{category !== "all" && <span className="text-muted-foreground"> · {category}</span>}
        </h2>
        <p className="text-xs text-muted-foreground mb-4">
          How your {currency} spending breathes month to month.
        </p>
        <div className="h-72">
          {byMonth.length === 0 ? (
            <div className="h-full flex items-center justify-center text-muted-foreground text-sm">
              No expenses in this scope
            </div>
          ) : (
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={byMonth} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                <defs>
                  <linearGradient id="trendFill" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="hsl(var(--primary))" stopOpacity={0.35} />
                    <stop offset="100%" stopColor="hsl(var(--primary))" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="2 6" stroke="hsl(var(--border))" vertical={false} />
                <XAxis
                  dataKey="label"
                  stroke="hsl(var(--muted-foreground))"
                  tickLine={false}
                  axisLine={false}
                  fontSize={11}
                />
                <YAxis
                  stroke="hsl(var(--muted-foreground))"
                  tickLine={false}
                  axisLine={false}
                  fontSize={11}
                  tickFormatter={(v) => formatInCurrency(v, currency)}
                />
                <Tooltip
                  contentStyle={{
                    borderRadius: 16,
                    border: "none",
                    background: "hsl(var(--popover))",
                    color: "hsl(var(--popover-foreground))",
                    boxShadow: "var(--shadow-card)",
                    fontSize: 12,
                  }}
                  formatter={(v: number) => formatInCurrency(v, currency)}
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
          )}
        </div>
      </Card>

      {/* Category bars */}
      <Card className="rounded-3xl border-0 shadow-soft p-6 bg-card">
        <h2 className="font-display text-xl mb-1">Categories this month</h2>
        <p className="text-xs text-muted-foreground mb-4">
          Soft view of where your {currency} flowed.
        </p>
        <div className="h-80">
          {thisMonthCats.length === 0 ? (
            <div className="h-full flex items-center justify-center text-muted-foreground text-sm">
              No expenses this month in {currency}
            </div>
          ) : (
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={thisMonthCats} layout="vertical" margin={{ left: 20, right: 20 }}>
                <CartesianGrid strokeDasharray="2 6" stroke="hsl(var(--border))" horizontal={false} />
                <XAxis
                  type="number"
                  stroke="hsl(var(--muted-foreground))"
                  tickLine={false}
                  axisLine={false}
                  fontSize={11}
                  tickFormatter={(v) => formatInCurrency(v, currency)}
                />
                <YAxis
                  type="category"
                  dataKey="category"
                  stroke="hsl(var(--muted-foreground))"
                  tickLine={false}
                  axisLine={false}
                  fontSize={11}
                  width={140}
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
                  formatter={(v: number) => formatInCurrency(v, currency)}
                />
                <Bar dataKey="amount" radius={[8, 8, 8, 8]}>
                  {thisMonthCats.map((entry) => (
                    <Cell key={entry.category} fill={`hsl(var(--${entry.meta.token}))`} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          )}
        </div>
      </Card>

      {/* Smart insights */}
      <Card className="rounded-3xl border-0 shadow-soft p-6 bg-gradient-to-br from-primary-soft to-accent">
        <div className="flex items-center gap-2 mb-3">
          <span className="text-2xl">✨</span>
          <h2 className="font-display text-xl">Smart insights</h2>
        </div>
        <div className="space-y-3 text-sm leading-relaxed text-foreground/90">
          {insights.topThisMonth ? (
            <p>
              This month you spent most on{" "}
              <span className="font-medium">
                {getCategoryMeta(insights.topThisMonth[0]).emoji}{" "}
                {getCategoryMeta(insights.topThisMonth[0]).key}
              </span>{" "}
              ({formatInCurrency(insights.topThisMonth[1], currency)}).
            </p>
          ) : (
            <p className="text-muted-foreground">No spending recorded this month yet.</p>
          )}

          {insights.pctDelta !== null && (
            <p>
              Compared to last month, spending is{" "}
              <span
                className={cn(
                  "font-medium",
                  insights.pctDelta > 0 ? "text-owe" : "text-owed",
                )}
              >
                {insights.pctDelta > 0 ? "up" : "down"} {Math.abs(insights.pctDelta).toFixed(0)}%
              </span>
              .
            </p>
          )}

          {insights.biggest && (
            <p>
              Your biggest single expense was{" "}
              <span className="font-medium">{insights.biggest.description}</span> at{" "}
              <span className="tabular-nums">
                {formatInCurrency(insights.biggest.total_amount, currency)}
              </span>
              .
            </p>
          )}

          {insights.topTrip && (
            <p>
              Your <span className="font-medium">{insights.topTrip[0]}</span> trip cost{" "}
              <span className="tabular-nums">
                {formatInCurrency(insights.topTrip[1].total, currency)}
              </span>{" "}
              total across {insights.topTrip[1].count}{" "}
              {insights.topTrip[1].count === 1 ? "expense" : "expenses"}.
            </p>
          )}
        </div>
      </Card>
    </div>
  );
}
