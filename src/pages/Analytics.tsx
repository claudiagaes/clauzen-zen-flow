import { useEffect, useMemo, useState } from "react";
import { format as formatDateFns } from "date-fns";
import { CalendarIcon } from "lucide-react";
import { getCategoryMeta, getExpenses, getMyAmount, CATEGORIES, type Expense } from "@/lib/data";
import { useCurrency } from "@/contexts/CurrencyContext";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
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


type DateRangeKey = "this-month" | "last-month" | "last-3" | "this-year" | "all" | "custom";
const DATE_RANGES: { key: DateRangeKey; label: string }[] = [
  { key: "this-month", label: "This month" },
  { key: "last-month", label: "Last month" },
  { key: "last-3", label: "Last 3 months" },
  { key: "this-year", label: "This year" },
  { key: "all", label: "All time" },
  { key: "custom", label: "Custom range" },
];

function inDateRange(iso: string, range: DateRangeKey, from?: Date, to?: Date) {
  if (range === "all") return true;
  const d = new Date(iso);
  const now = new Date();
  if (range === "this-month") {
    return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
  }
  if (range === "last-month") {
    const lm = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    return d.getMonth() === lm.getMonth() && d.getFullYear() === lm.getFullYear();
  }
  if (range === "this-year") {
    return d.getFullYear() === now.getFullYear();
  }
  if (range === "last-3") {
    const cutoff = new Date(now.getFullYear(), now.getMonth() - 2, 1);
    return d >= cutoff;
  }
  if (range === "custom") {
    if (from && d < new Date(from.getFullYear(), from.getMonth(), from.getDate())) return false;
    if (to && d > new Date(to.getFullYear(), to.getMonth(), to.getDate(), 23, 59, 59)) return false;
    return true;
  }
  return true;
}

export default function Analytics() {
  const [all, setAll] = useState<Expense[]>([]);
  const [category, setCategory] = useState<string>("all");
  const [dateRange, setDateRange] = useState<DateRangeKey>("this-year");
  const [customFrom, setCustomFrom] = useState<Date | undefined>();
  const [customTo, setCustomTo] = useState<Date | undefined>();
  const [customOpen, setCustomOpen] = useState(false);
  const [draftFrom, setDraftFrom] = useState<Date | undefined>();
  const [draftTo, setDraftTo] = useState<Date | undefined>();
  const { display, format: formatMoney, formatNative, convert } = useCurrency();

  // When opening the picker, seed drafts with the currently applied range
  useEffect(() => {
    if (customOpen) {
      setDraftFrom(customFrom);
      setDraftTo(customTo);
    }
  }, [customOpen, customFrom, customTo]);

  const applyCustom = () => {
    setCustomFrom(draftFrom);
    setCustomTo(draftTo);
    setDateRange("custom");
    setCustomOpen(false);
  };

  const clearCustom = () => {
    setDraftFrom(undefined);
    setDraftTo(undefined);
    setCustomFrom(undefined);
    setCustomTo(undefined);
  };


  useEffect(() => {
    getExpenses().then(setAll);
  }, []);

  // All amounts converted to USD. Track original currency for tooltip on biggest expense.
  // Step 1: filter by date range. All math in USD.
  const scoped = useMemo(
    () =>
      all.filter(
        (e) =>
          inDateRange(e.date, dateRange, customFrom, customTo) &&
          e.my_amount != null &&
          e.my_amount > 0,
      ),
    [all, dateRange, customFrom, customTo],
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

  // Monthly totals in USD with count of expenses
  const byMonth = useMemo(() => {
    const map = new Map<string, { total: number; count: number }>();
    for (const e of filtered) {
      const d = new Date(e.date);
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
      const cur = map.get(key) ?? { total: 0, count: 0 };
      cur.total += convert(getMyAmount(e), e.currency);
      cur.count += 1;
      map.set(key, cur);
    }
    return Array.from(map.entries())
      .sort()
      .map(([key, { total, count }]) => {
        const [y, m] = key.split("-").map(Number);
        return {
          key,
          label: new Date(y, m - 1, 1).toLocaleDateString("en-US", { month: "short", year: "numeric" }),
          total: +total.toFixed(2),
          count,
        };
      });
  }, [filtered, convert]);

  // Top categories within the current scope (respects the active date range)
  const thisMonthCats = useMemo(() => {
    const m = new Map<string, number>();
    scoped.forEach((e) =>
      m.set(e.category, (m.get(e.category) ?? 0) + convert(getMyAmount(e), e.currency)),
    );
    return Array.from(m.entries())
      .map(([cat, amount]) => ({
        category: cat,
        amount: +amount.toFixed(2),
        meta: getCategoryMeta(cat),
      }))
      .sort((a, b) => b.amount - a.amount);
  }, [scoped, convert]);

  // Stats
  const topCat = thisMonthCats[0];

  // Proportional "vs last month": compare same-window day-of-month range.
  // If today is April 15, compare Apr 1–15 vs Mar 1–15. If month is over, full vs full.
  const { trend, trendIsPartial } = useMemo(() => {
    const now = new Date();
    const y = now.getFullYear();
    const m = now.getMonth();
    const lastDayThisMonth = new Date(y, m + 1, 0).getDate();
    const isCurrentMonthOver = now.getDate() >= lastDayThisMonth;
    const cutoffDay = isCurrentMonthOver ? lastDayThisMonth : now.getDate();

    const sumWindow = (year: number, month: number, dayCap: number) => {
      const lastDay = new Date(year, month + 1, 0).getDate();
      const cap = Math.min(dayCap, lastDay);
      return filtered
        .filter((e) => {
          const d = new Date(e.date);
          return (
            d.getFullYear() === year &&
            d.getMonth() === month &&
            d.getDate() <= cap
          );
        })
        .reduce((a, e) => a + convert(getMyAmount(e), e.currency), 0);
    };

    const thisTotal = sumWindow(y, m, cutoffDay);
    const lmDate = new Date(y, m - 1, 1);
    const lastTotal = sumWindow(lmDate.getFullYear(), lmDate.getMonth(), cutoffDay);

    const t = lastTotal > 0 ? ((thisTotal - lastTotal) / lastTotal) * 100 : 0;
    return { trend: t, trendIsPartial: !isCurrentMonthOver };
  }, [filtered, convert]);

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
    const monthTotal = monthExpenses.reduce((a, e) => a + convert(getMyAmount(e), e.currency), 0);

    const catMap = new Map<string, number>();
    monthExpenses.forEach((e) =>
      catMap.set(e.category, (catMap.get(e.category) ?? 0) + convert(getMyAmount(e), e.currency)),
    );
    const topThisMonth = Array.from(catMap.entries()).sort((a, b) => b[1] - a[1])[0];

    const lm = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    const lastMonthTotal = filtered
      .filter((e) => {
        const d = new Date(e.date);
        return d.getMonth() === lm.getMonth() && d.getFullYear() === lm.getFullYear();
      })
      .reduce((a, e) => a + convert(getMyAmount(e), e.currency), 0);

    const pctDelta =
      lastMonthTotal > 0 ? ((monthTotal - lastMonthTotal) / lastMonthTotal) * 100 : null;

    const biggest = [...filtered].sort(
      (a, b) => convert(getMyAmount(b), b.currency) - convert(getMyAmount(a), a.currency),
    )[0];

    const tripMap = new Map<string, { total: number; count: number }>();
    filtered.forEach((e) => {
      if (!e.event_tag) return;
      const cur = tripMap.get(e.event_tag) ?? { total: 0, count: 0 };
      cur.total += convert(getMyAmount(e), e.currency);
      cur.count += 1;
      tripMap.set(e.event_tag, cur);
    });
    const topTrip = Array.from(tripMap.entries()).sort((a, b) => b[1].total - a[1].total)[0];

    return { topThisMonth, pctDelta, biggest, topTrip, monthTotal };
  }, [filtered, convert]);

  return (
    <div className="space-y-8 pt-4 fade-in">
      <header className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="font-display text-3xl md:text-4xl">Analytics</h1>
          <p className="text-muted-foreground mt-1">
            Patterns, gently revealed. All amounts shown in {display}.
          </p>
        </div>
        <div className="text-xs text-muted-foreground bg-secondary rounded-2xl px-3 py-2">
          {display === "MXN"
            ? "Rates: 1 USD = $18.5 MXN · 1 EUR = $20 MXN"
            : "Rates: 1 EUR = $1.08 · 1 MXN ≈ $0.054"}
        </div>
      </header>

      {/* Date range filter */}
      <div className="flex flex-wrap items-center gap-3">
        <div className="inline-flex flex-wrap items-center gap-1 bg-secondary rounded-2xl p-1">
          {DATE_RANGES.filter((r) => r.key !== "custom").map((r) => (
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
          <Popover open={customOpen} onOpenChange={setCustomOpen}>
            <PopoverTrigger asChild>
              <button
                className={cn(
                  "px-3 py-1.5 text-xs rounded-xl transition-colors inline-flex items-center gap-1.5",
                  dateRange === "custom"
                    ? "bg-card text-foreground shadow-soft"
                    : "text-muted-foreground hover:text-foreground",
                )}
              >
                <CalendarIcon className="h-3 w-3" />
                {dateRange === "custom" && (customFrom || customTo)
                  ? `${customFrom ? formatDateFns(customFrom, "MMM d, yyyy") : "…"} → ${customTo ? formatDateFns(customTo, "MMM d, yyyy") : "…"}`
                  : "Custom range"}
              </button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0 rounded-2xl" align="start">
              <div className="p-4 space-y-3">
                <div className="text-xs uppercase tracking-widest text-muted-foreground font-medium">
                  Pick a date range
                </div>
                <div className="flex flex-col sm:flex-row gap-4">
                  <div>
                    <div className="text-[11px] text-muted-foreground mb-1.5 font-medium">From</div>
                    <div className="rounded-xl border border-border">
                      <Calendar
                        mode="single"
                        selected={draftFrom}
                        onSelect={setDraftFrom}
                        defaultMonth={draftFrom ?? draftTo ?? new Date()}
                        captionLayout="dropdown-buttons"
                        fromYear={2015}
                        toYear={new Date().getFullYear() + 1}
                        className={cn("p-2 pointer-events-auto")}
                      />
                    </div>
                  </div>
                  <div>
                    <div className="text-[11px] text-muted-foreground mb-1.5 font-medium">To</div>
                    <div className="rounded-xl border border-border">
                      <Calendar
                        mode="single"
                        selected={draftTo}
                        onSelect={setDraftTo}
                        defaultMonth={draftTo ?? draftFrom ?? new Date()}
                        captionLayout="dropdown-buttons"
                        fromYear={2015}
                        toYear={new Date().getFullYear() + 1}
                        className={cn("p-2 pointer-events-auto")}
                      />
                    </div>
                  </div>
                </div>
                <div className="flex items-center justify-between gap-2 pt-1">
                  <div className="text-xs text-muted-foreground tabular-nums">
                    {draftFrom || draftTo ? (
                      <>
                        {draftFrom ? formatDateFns(draftFrom, "MMM d, yyyy") : "—"}
                        {" → "}
                        {draftTo ? formatDateFns(draftTo, "MMM d, yyyy") : "—"}
                      </>
                    ) : (
                      "No range selected"
                    )}
                  </div>
                  <div className="flex items-center gap-2">
                    <Button
                      variant="ghost"
                      size="sm"
                      className="rounded-xl text-xs h-8"
                      onClick={() => setCustomOpen(false)}
                    >
                      Cancel
                    </Button>
                    <Button
                      size="sm"
                      className="rounded-xl text-xs h-8"
                      disabled={!draftFrom && !draftTo}
                      onClick={applyCustom}
                    >
                      Apply
                    </Button>
                  </div>
                </div>
              </div>
            </PopoverContent>
          </Popover>
        </div>

        {dateRange === "custom" && (customFrom || customTo) && (
          <button
            onClick={clearCustom}
            className="text-xs text-muted-foreground hover:text-foreground underline"
          >
            clear range
          </button>
        )}
      </div>

      {/* Insights cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {(() => {
          const topLabel =
            dateRange === "this-month"
              ? "Top this month"
              : dateRange === "last-month"
                ? "Top last month"
                : dateRange === "last-3"
                  ? "Top · last 3 months"
                  : dateRange === "this-year"
                    ? "Top this year"
                    : dateRange === "all"
                      ? "Top overall"
                      : "Top in range";
          return topCat ? (
            <Card className="rounded-3xl border-0 shadow-soft p-6 bg-primary-soft">
              <div className="text-xs text-primary font-medium uppercase tracking-widest">
                {topLabel}
              </div>
              <div className="font-display text-2xl mt-2">
                {topCat.meta.emoji} {topCat.meta.key}
              </div>
              <div className="text-sm text-muted-foreground mt-1 tabular-nums">
                {formatMoney(topCat.amount)}
              </div>
            </Card>
          ) : (
            <Card className="rounded-3xl border-0 shadow-soft p-6 bg-primary-soft">
              <div className="text-xs text-primary font-medium uppercase tracking-widest">
                {topLabel}
              </div>
              <div className="font-display text-2xl mt-2 text-muted-foreground">No data</div>
            </Card>
          );
        })()}
        <Card className="rounded-3xl border-0 shadow-soft p-6 bg-secondary">
          <div className="text-xs text-foreground/70 uppercase tracking-widest font-medium">
            Monthly average
          </div>
          <div className="font-display text-3xl mt-2 tabular-nums">{formatMoney(avgMonthly)}</div>
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
            {trendIsPartial
              ? `month-to-date vs same days last month`
              : trend > 0
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
          How your spending breathes month to month (in USD).
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
                  interval="preserveStartEnd"
                  minTickGap={20}
                />
                <YAxis
                  stroke="hsl(var(--muted-foreground))"
                  tickLine={false}
                  axisLine={false}
                  fontSize={11}
                  tickFormatter={(v) => formatMoney(v)}
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
                  content={({ active, payload }) => {
                    if (!active || !payload?.length) return null;
                    const p = payload[0].payload as {
                      label: string;
                      total: number;
                      count: number;
                    };
                    return (
                      <div
                        className="rounded-2xl bg-popover text-popover-foreground shadow-card px-4 py-2.5 text-xs"
                        style={{ border: "none" }}
                      >
                        <div className="font-medium">{p.label}</div>
                        <div className="text-muted-foreground mt-0.5">
                          <span className="tabular-nums text-foreground">{formatMoney(p.total)}</span>
                          {" "}across {p.count} {p.count === 1 ? "expense" : "expenses"}
                        </div>
                      </div>
                    );
                  }}
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
          Soft view of where your money flowed (in USD).
        </p>
        <div className="h-80">
          {thisMonthCats.length === 0 ? (
            <div className="h-full flex items-center justify-center text-muted-foreground text-sm">
              No expenses this month
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
                  tickFormatter={(v) => formatMoney(v)}
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
                  formatter={(v: number) => formatMoney(v)}
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
              ({formatMoney(insights.topThisMonth[1])}).
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
                {formatMoney(convert(getMyAmount(insights.biggest), insights.biggest.currency))}
              </span>
              {insights.biggest.currency !== "USD" && (
                <span className="text-muted-foreground">
                  {" "}(converted from {formatNative(getMyAmount(insights.biggest), insights.biggest.currency)})
                </span>
              )}
              {" "}(your share).
            </p>
          )}

          {insights.topTrip && (
            <p>
              Your <span className="font-medium">{insights.topTrip[0]}</span> trip cost{" "}
              <span className="tabular-nums">{formatMoney(insights.topTrip[1].total)}</span>{" "}
              total across {insights.topTrip[1].count}{" "}
              {insights.topTrip[1].count === 1 ? "expense" : "expenses"}.
            </p>
          )}
        </div>
      </Card>

      {/* Rockie WhatsApp banner */}
      <Card className="rounded-3xl border-0 shadow-soft p-5 bg-gradient-to-r from-primary/10 via-accent/10 to-primary/10">
        <p className="text-sm sm:text-base text-foreground leading-relaxed">
          <span className="mr-1">💬</span>
          <span className="font-display text-lg mr-1">Ask Rockie about your spending</span>
          — send a WhatsApp message to get instant AI insights about your expenses.
        </p>
      </Card>
    </div>
  );
}
