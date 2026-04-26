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
  Pie,
  PieChart,
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
  const { display, format: formatMoney, convert } = useCurrency();

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

  // Monthly totals across ALL expenses (not date-filtered) — trend chart shows everything,
  // and we highlight the months that fall inside the active date range.
  const allValid = useMemo(
    () => all.filter((e) => e.my_amount != null && e.my_amount > 0),
    [all],
  );
  const allValidByCategory = useMemo(
    () => (category === "all" ? allValid : allValid.filter((e) => e.category === category)),
    [allValid, category],
  );

  const byMonth = useMemo(() => {
    const map = new Map<string, { total: number; count: number }>();
    for (const e of allValidByCategory) {
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
        const monthStart = new Date(y, m - 1, 1);
        const monthEnd = new Date(y, m, 0, 23, 59, 59);
        // A month is "in selected period" if any day of it overlaps the active range.
        let inSelected = true;
        if (dateRange !== "all") {
          const now = new Date();
          let from: Date | undefined;
          let to: Date | undefined;
          if (dateRange === "this-month") {
            from = new Date(now.getFullYear(), now.getMonth(), 1);
            to = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59);
          } else if (dateRange === "last-month") {
            from = new Date(now.getFullYear(), now.getMonth() - 1, 1);
            to = new Date(now.getFullYear(), now.getMonth(), 0, 23, 59, 59);
          } else if (dateRange === "last-3") {
            from = new Date(now.getFullYear(), now.getMonth() - 2, 1);
            to = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59);
          } else if (dateRange === "this-year") {
            from = new Date(now.getFullYear(), 0, 1);
            to = new Date(now.getFullYear(), 11, 31, 23, 59, 59);
          } else if (dateRange === "custom") {
            from = customFrom;
            to = customTo;
          }
          if (from && monthEnd < from) inSelected = false;
          if (to && monthStart > to) inSelected = false;
        }
        return {
          key,
          label: monthStart.toLocaleDateString("en-US", { month: "short", year: "numeric" }),
          total: +total.toFixed(2),
          count,
          inSelected,
        };
      })
      // Only show months that fall inside the active period.
      // For "All time" every month is marked inSelected, so nothing is filtered out.
      .filter((m) => m.inSelected);
  }, [allValidByCategory, convert, dateRange, customFrom, customTo]);

  // Categories within the selected period (for the breakdown / pie)
  const periodCats = useMemo(() => {
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

  // Total spent in the selected period (after category filter)
  const periodTotal = useMemo(
    () => filtered.reduce((a, e) => a + convert(getMyAmount(e), e.currency), 0),
    [filtered, convert],
  );

  // Monthly average — only across months that have data (already filtered to my_amount > 0)
  const avgMonthly = byMonth.length
    ? byMonth.reduce((a, x) => a + x.total, 0) / byMonth.length
    : 0;

  // Vs previous period — compares the active selection against the equally-long
  // window immediately before it. Adapts to whatever date range is active.
  // - "this-month" → vs last month (same day-of-month cutoff if month not over)
  // - "last-month" → vs the month before that
  // - "last-3"     → vs the 3 months before that
  // - "this-year"  → vs last year
  // - "custom"     → vs the same number of days right before "from"
  // - "all"        → not available
  const vsPrevious = useMemo(() => {
    const sumRange = (from: Date, to: Date) =>
      allValidByCategory
        .filter((e) => {
          const d = new Date(e.date);
          return d >= from && d <= to;
        })
        .reduce((a, e) => a + convert(getMyAmount(e), e.currency), 0);

    const now = new Date();
    let curFrom: Date | undefined;
    let curTo: Date | undefined;
    let prevFrom: Date | undefined;
    let prevTo: Date | undefined;
    let isPartial = false;
    let label = "vs previous period";

    if (dateRange === "this-month") {
      const y = now.getFullYear();
      const m = now.getMonth();
      const lastDay = new Date(y, m + 1, 0).getDate();
      isPartial = now.getDate() < lastDay;
      const cutoff = isPartial ? now.getDate() : lastDay;
      curFrom = new Date(y, m, 1);
      curTo = new Date(y, m, cutoff, 23, 59, 59);
      const lmLastDay = new Date(y, m, 0).getDate();
      const prevCutoff = Math.min(cutoff, lmLastDay);
      prevFrom = new Date(y, m - 1, 1);
      prevTo = new Date(y, m - 1, prevCutoff, 23, 59, 59);
      label = isPartial ? "month-to-date vs same days last month" : "vs last month";
    } else if (dateRange === "last-month") {
      const y = now.getFullYear();
      const m = now.getMonth();
      curFrom = new Date(y, m - 1, 1);
      curTo = new Date(y, m, 0, 23, 59, 59);
      prevFrom = new Date(y, m - 2, 1);
      prevTo = new Date(y, m - 1, 0, 23, 59, 59);
      label = "vs the month before";
    } else if (dateRange === "last-3") {
      const y = now.getFullYear();
      const m = now.getMonth();
      curFrom = new Date(y, m - 2, 1);
      curTo = new Date(y, m + 1, 0, 23, 59, 59);
      prevFrom = new Date(y, m - 5, 1);
      prevTo = new Date(y, m - 2, 0, 23, 59, 59);
      label = "vs the previous 3 months";
    } else if (dateRange === "this-year") {
      const y = now.getFullYear();
      curFrom = new Date(y, 0, 1);
      curTo = new Date(y, 11, 31, 23, 59, 59);
      prevFrom = new Date(y - 1, 0, 1);
      prevTo = new Date(y - 1, 11, 31, 23, 59, 59);
      label = "vs last year";
    } else if (dateRange === "custom" && customFrom && customTo) {
      curFrom = new Date(customFrom);
      curFrom.setHours(0, 0, 0, 0);
      curTo = new Date(customTo);
      curTo.setHours(23, 59, 59, 999);
      const ms = curTo.getTime() - curFrom.getTime();
      prevTo = new Date(curFrom.getTime() - 1);
      prevFrom = new Date(prevTo.getTime() - ms);
      label = "vs the previous range";
    } else {
      return { available: false as const, label: "vs previous period" };
    }

    const curTotal = sumRange(curFrom, curTo);
    const prevTotal = sumRange(prevFrom, prevTo);

    if (curTotal <= 0 || prevTotal <= 0) {
      return { available: false as const, label };
    }
    return {
      available: true as const,
      pct: ((curTotal - prevTotal) / prevTotal) * 100,
      isPartial,
      label,
    };
  }, [dateRange, customFrom, customTo, allValidByCategory, convert]);

  // Smart insight — top category in current period vs the period total
  const smartInsight = useMemo(() => {
    if (!periodCats.length || periodTotal <= 0) return null;
    const top = periodCats[0];
    const pct = (top.amount / periodTotal) * 100;
    return { top, pct };
  }, [periodCats, periodTotal]);

  // Period label, used in copy
  const periodLabel = useMemo(() => {
    switch (dateRange) {
      case "this-month":
        return "this month";
      case "last-month":
        return "last month";
      case "last-3":
        return "in the last 3 months";
      case "this-year":
        return "this year";
      case "all":
        return "all time";
      case "custom":
        if (customFrom && customTo)
          return `from ${formatDateFns(customFrom, "MMM d, yyyy")} to ${formatDateFns(customTo, "MMM d, yyyy")}`;
        if (customFrom) return `from ${formatDateFns(customFrom, "MMM d, yyyy")}`;
        if (customTo) return `until ${formatDateFns(customTo, "MMM d, yyyy")}`;
        return "in the selected range";
    }
  }, [dateRange, customFrom, customTo]);

  const periodTitle = useMemo(() => {
    switch (dateRange) {
      case "this-month":
        return "This month";
      case "last-month":
        return "Last month";
      case "last-3":
        return "Last 3 months";
      case "this-year":
        return "This year";
      case "all":
        return "All time";
      case "custom":
        return "Selected range";
    }
  }, [dateRange]);

  const hasPeriodData = periodTotal > 0 && filtered.length > 0;

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

      {/* Smart insight banner */}
      {smartInsight && (
        <Card className="rounded-3xl border-0 shadow-soft p-5 bg-gradient-to-br from-primary-soft to-accent">
          <div className="flex items-start gap-3">
            <span className="text-2xl leading-none mt-0.5">✨</span>
            <p className="text-sm sm:text-base leading-relaxed text-foreground/90">
              Your biggest expense category {periodLabel} is{" "}
              <span className="font-medium">
                {smartInsight.top.meta.emoji} {smartInsight.top.meta.key}
              </span>{" "}
              at{" "}
              <span className="tabular-nums font-medium">
                {formatMoney(smartInsight.top.amount)}
              </span>{" "}
              <span className="text-muted-foreground">
                ({smartInsight.pct.toFixed(0)}% of total)
              </span>
              .
            </p>
          </div>
        </Card>
      )}

      {/* Top stats row */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Total spent — prominent */}
        <Card className="rounded-3xl border-0 shadow-soft p-6 bg-primary-soft md:col-span-1">
          <div className="text-xs text-primary font-medium uppercase tracking-widest">
            Total spent · {periodTitle.toLowerCase()}
          </div>
          <div className="font-display text-4xl md:text-5xl mt-3 tabular-nums leading-none">
            {formatMoney(periodTotal)}
          </div>
          <div className="text-xs text-muted-foreground mt-2">
            {filtered.length} {filtered.length === 1 ? "expense" : "expenses"}
            {category !== "all" && ` · ${getCategoryMeta(category).emoji} ${getCategoryMeta(category).key}`}
          </div>
        </Card>

        {/* Monthly average */}
        <Card className="rounded-3xl border-0 shadow-soft p-6 bg-secondary">
          <div className="text-xs text-foreground/70 uppercase tracking-widest font-medium">
            Monthly average
          </div>
          <div className="font-display text-3xl mt-3 tabular-nums">
            {byMonth.length > 0 ? formatMoney(avgMonthly) : "—"}
          </div>
          <div className="text-xs text-muted-foreground mt-2">
            {byMonth.length > 0
              ? `Based on ${byMonth.length} ${byMonth.length === 1 ? "month" : "months"} of data`
              : "No months with data yet"}
          </div>
        </Card>

        {/* Vs previous period — adapts to the active date range */}
        <Card className="rounded-3xl border-0 shadow-soft p-6 bg-accent">
          <div className="text-xs text-accent-foreground uppercase tracking-widest font-medium">
            {dateRange === "this-month"
              ? "Vs last month"
              : dateRange === "last-month"
                ? "Vs the month before"
                : dateRange === "this-year"
                  ? "Vs last year"
                  : "Vs previous period"}
          </div>
          {vsPrevious.available ? (
            <>
              <div
                className={cn(
                  "font-display text-3xl mt-3 tabular-nums",
                  vsPrevious.pct > 0 ? "text-owe" : "text-owed",
                )}
              >
                {vsPrevious.pct > 0 ? "+" : ""}
                {vsPrevious.pct.toFixed(1)}%
              </div>
              <div className="text-xs text-muted-foreground mt-2">{vsPrevious.label}</div>
            </>
          ) : (
            <>
              <div className="font-display text-2xl mt-3 text-muted-foreground">
                No previous data
              </div>
              <div className="text-xs text-muted-foreground mt-2">
                {dateRange === "all"
                  ? "All-time view has no prior period"
                  : "Need spending in both periods to compare"}
              </div>
            </>
          )}
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

      {/* Empty state for the selected period */}
      {!hasPeriodData && (
        <Card className="rounded-3xl border-0 shadow-soft p-10 bg-card text-center">
          <div className="text-4xl mb-3">🧘</div>
          <p className="text-base text-foreground">No expense data for this period yet</p>
          <p className="text-xs text-muted-foreground mt-1">
            Try a different range or add an expense to see insights here.
          </p>
        </Card>
      )}

      {/* Monthly trend — always shows ALL months with data, highlights the selected period.
          Renders bar chart if only 1 month total, line/area otherwise. */}
      <Card className="rounded-3xl border-0 shadow-soft p-6 bg-card">
        <h2 className="font-display text-xl mb-1">
          Monthly trend
          {category !== "all" && (
            <span className="text-muted-foreground"> · {category}</span>
          )}
        </h2>
        <p className="text-xs text-muted-foreground mb-4">
          All months with data. Highlighted bars/points are inside your selected period.
        </p>
        <div className="h-72">
          {byMonth.length === 0 ? (
            <div className="h-full flex items-center justify-center text-muted-foreground text-sm">
              No expenses yet
            </div>
          ) : byMonth.length === 1 ? (
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={byMonth} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
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
                  tickFormatter={(v) => formatMoney(v)}
                />
                <Tooltip
                  cursor={{ fill: "hsl(var(--secondary))", radius: 12 }}
                  content={({ active, payload }) => {
                    if (!active || !payload?.length) return null;
                    const p = payload[0].payload as { label: string; total: number; count: number };
                    return (
                      <div className="rounded-2xl bg-popover text-popover-foreground shadow-card px-4 py-2.5 text-xs">
                        <div className="font-medium">{p.label}</div>
                        <div className="text-muted-foreground mt-0.5">
                          <span className="tabular-nums text-foreground">{formatMoney(p.total)}</span>
                          {" "}across {p.count} {p.count === 1 ? "expense" : "expenses"}
                        </div>
                      </div>
                    );
                  }}
                />
                <Bar dataKey="total" radius={[10, 10, 10, 10]}>
                  {byMonth.map((m) => (
                    <Cell
                      key={m.key}
                      fill={
                        m.inSelected ? "hsl(var(--primary))" : "hsl(var(--muted-foreground) / 0.25)"
                      }
                    />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
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
                  content={({ active, payload }) => {
                    if (!active || !payload?.length) return null;
                    const p = payload[0].payload as {
                      label: string;
                      total: number;
                      count: number;
                      inSelected: boolean;
                    };
                    return (
                      <div className="rounded-2xl bg-popover text-popover-foreground shadow-card px-4 py-2.5 text-xs">
                        <div className="font-medium">
                          {p.label}
                          {p.inSelected && (
                            <span className="ml-1.5 text-[10px] text-primary">• selected</span>
                          )}
                        </div>
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
                  dot={(props: { cx?: number; cy?: number; payload?: { inSelected: boolean; key: string } }) => {
                    const { cx, cy, payload } = props;
                    if (cx == null || cy == null || !payload) {
                      return <g key={`empty-${Math.random()}`} />;
                    }
                    const isSel = payload.inSelected;
                    return (
                      <circle
                        key={payload.key}
                        cx={cx}
                        cy={cy}
                        r={isSel ? 5 : 3}
                        fill={isSel ? "hsl(var(--primary))" : "hsl(var(--muted-foreground) / 0.4)"}
                        stroke="hsl(var(--card))"
                        strokeWidth={2}
                      />
                    );
                  }}
                  activeDot={{ r: 6, fill: "hsl(var(--primary))" }}
                />
              </AreaChart>
            </ResponsiveContainer>
          )}
        </div>
      </Card>

      {/* Spending breakdown — pie + bars side by side for selected period */}
      {hasPeriodData && periodCats.length > 0 && (
        <Card className="rounded-3xl border-0 shadow-soft p-6 bg-card">
          <h2 className="font-display text-xl mb-1">
            Spending breakdown · {periodTitle.toLowerCase()}
          </h2>
          <p className="text-xs text-muted-foreground mb-4">
            How {periodLabel === "all time" ? "all your spending" : "this period"} splits across categories.
          </p>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 items-center">
            {/* Pie */}
            <div className="h-72">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={periodCats}
                    dataKey="amount"
                    nameKey="category"
                    cx="50%"
                    cy="50%"
                    innerRadius={60}
                    outerRadius={105}
                    paddingAngle={2}
                    stroke="hsl(var(--card))"
                    strokeWidth={3}
                  >
                    {periodCats.map((entry) => (
                      <Cell key={entry.category} fill={`hsl(var(--${entry.meta.token}))`} />
                    ))}
                  </Pie>
                  <Tooltip
                    content={({ active, payload }) => {
                      if (!active || !payload?.length) return null;
                      const p = payload[0].payload as {
                        category: string;
                        amount: number;
                        meta: { emoji: string; key: string };
                      };
                      const pct = (p.amount / periodTotal) * 100;
                      return (
                        <div className="rounded-2xl bg-popover text-popover-foreground shadow-card px-4 py-2.5 text-xs">
                          <div className="font-medium">
                            {p.meta.emoji} {p.meta.key}
                          </div>
                          <div className="text-muted-foreground mt-0.5">
                            <span className="tabular-nums text-foreground">
                              {formatMoney(p.amount)}
                            </span>{" "}
                            · {pct.toFixed(0)}%
                          </div>
                        </div>
                      );
                    }}
                  />
                </PieChart>
              </ResponsiveContainer>
            </div>

            {/* Legend with % */}
            <div className="space-y-2.5">
              {periodCats.map((c) => {
                const pct = (c.amount / periodTotal) * 100;
                return (
                  <div key={c.category} className="flex items-center gap-3">
                    <div
                      className="h-3 w-3 rounded-full shrink-0"
                      style={{ backgroundColor: `hsl(var(--${c.meta.token}))` }}
                    />
                    <div className="flex-1 min-w-0 flex items-center justify-between gap-3">
                      <span className="text-sm truncate">
                        {c.meta.emoji} {c.meta.key}
                      </span>
                      <span className="text-xs text-muted-foreground tabular-nums shrink-0">
                        {formatMoney(c.amount)} · {pct.toFixed(0)}%
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </Card>
      )}

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
