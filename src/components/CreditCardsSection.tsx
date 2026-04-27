import { useMemo, useState } from "react";
import { Card } from "@/components/ui/card";
import {
  Drawer,
  DrawerContent,
  DrawerDescription,
  DrawerHeader,
  DrawerTitle,
} from "@/components/ui/drawer";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import type { Bill, BillPayment } from "@/lib/bills";
import { convertAmount, formatMoney } from "@/lib/format";

interface Props {
  bills: Bill[];
  payments: BillPayment[];
}

interface CardConfig {
  match: (name: string) => boolean;
  label: string;
  hue: number; // CSS hsl hue for color coding
  emoji: string;
}

// Match by bill name keywords. Order matters (most specific first).
const CARD_CONFIGS: CardConfig[] = [
  { match: (n) => /chase/i.test(n), label: "Chase", hue: 215, emoji: "💳" },
  { match: (n) => /amex.*(mexico|mx)/i.test(n), label: "Amex Mexico", hue: 25, emoji: "💳" },
  { match: (n) => /amex.*(us|usa)?/i.test(n) && !/mexico|mx/i.test(n), label: "Amex US", hue: 145, emoji: "💳" },
];

function startOfMonth(d: Date) {
  return new Date(d.getFullYear(), d.getMonth(), 1);
}
function monthKey(d: Date) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
}
function shortMonth(d: Date) {
  return d.toLocaleDateString("en-US", { month: "short" });
}

export function CreditCardsSection({ bills, payments }: Props) {
  const ccBills = useMemo(() => bills.filter((b) => b.category === "credit_card"), [bills]);
  const ccBillIds = useMemo(() => new Set(ccBills.map((b) => b.id)), [ccBills]);
  const ccPayments = useMemo(
    () => payments.filter((p) => ccBillIds.has(p.bill_id) && p.status === "paid" && p.amount_paid != null),
    [payments, ccBillIds],
  );

  // ---------- Last 6 months stacked chart ----------
  const monthlyData = useMemo(() => {
    const today = new Date();
    const months: { key: string; label: string; usd: number; mxn: number; mxnUsd: number }[] = [];
    for (let i = 5; i >= 0; i--) {
      const d = new Date(today.getFullYear(), today.getMonth() - i, 1);
      months.push({ key: monthKey(d), label: shortMonth(d), usd: 0, mxn: 0, mxnUsd: 0 });
    }
    for (const p of ccPayments) {
      const d = new Date(p.paid_date + "T00:00:00");
      const k = monthKey(d);
      const slot = months.find((m) => m.key === k);
      if (!slot) continue;
      const amt = p.amount_paid ?? 0;
      const cur = p.currency ?? bills.find((b) => b.id === p.bill_id)?.currency ?? "USD";
      if (cur === "MXN") {
        slot.mxn += amt;
        slot.mxnUsd += convertAmount(amt, "MXN", "USD");
      } else {
        slot.usd += amt;
      }
    }
    return months;
  }, [ccPayments, bills]);

  const currentMonth = monthlyData[monthlyData.length - 1];

  // ---------- Per-card breakdown ----------
  type CardData = {
    config: CardConfig;
    bill: Bill | null;
    thisMonthPaid: number;
    thisMonthCurrency: string;
    last3: { label: string; value: number }[];
    ytd: number; // in USD for cross-card comparability
    ytdCurrency: string; // shows native currency total too
    ytdNative: number;
    payments: BillPayment[];
  };

  const cardData: CardData[] = useMemo(() => {
    const today = new Date();
    const yearStart = new Date(today.getFullYear(), 0, 1);
    return CARD_CONFIGS.map((cfg) => {
      const bill = ccBills.find((b) => cfg.match(b.name)) ?? null;
      const billPayments = bill
        ? ccPayments
            .filter((p) => p.bill_id === bill.id)
            .sort((a, b) => (a.paid_date < b.paid_date ? 1 : -1))
        : [];
      const cur = bill?.currency ?? "USD";

      // This month
      const thisMonthStart = startOfMonth(today);
      const thisMonthPaid = billPayments
        .filter((p) => new Date(p.paid_date + "T00:00:00") >= thisMonthStart)
        .reduce((s, p) => s + (p.amount_paid ?? 0), 0);

      // Last 3 months sparkline
      const last3: { label: string; value: number }[] = [];
      for (let i = 2; i >= 0; i--) {
        const d = new Date(today.getFullYear(), today.getMonth() - i, 1);
        const end = new Date(today.getFullYear(), today.getMonth() - i + 1, 1);
        const v = billPayments
          .filter((p) => {
            const pd = new Date(p.paid_date + "T00:00:00");
            return pd >= d && pd < end;
          })
          .reduce((s, p) => s + (p.amount_paid ?? 0), 0);
        last3.push({ label: shortMonth(d), value: v });
      }

      // YTD
      const ytdNative = billPayments
        .filter((p) => new Date(p.paid_date + "T00:00:00") >= yearStart)
        .reduce((s, p) => s + (p.amount_paid ?? 0), 0);
      const ytd = convertAmount(ytdNative, cur, "USD");

      return {
        config: cfg,
        bill,
        thisMonthPaid,
        thisMonthCurrency: cur,
        last3,
        ytd,
        ytdCurrency: cur,
        ytdNative,
        payments: billPayments,
      };
    });
  }, [ccBills, ccPayments]);

  const [drawerCard, setDrawerCard] = useState<CardData | null>(null);

  if (ccBills.length === 0) return null;

  return (
    <section className="space-y-4 rise-in">
      <h2 className="font-display text-xl flex items-center gap-2">
        <span>💳</span> Credit Cards
      </h2>

      {/* Monthly total chart */}
      <Card className="rounded-3xl border-0 shadow-card bg-card p-5">
        <div className="flex items-start justify-between gap-3 flex-wrap">
          <div>
            <div className="text-xs uppercase tracking-widest text-muted-foreground">
              Monthly total · last 6 months
            </div>
            <div className="font-display text-lg mt-1">Credit Card Payments</div>
          </div>
          <div className="text-right">
            <div className="text-[10px] uppercase tracking-widest text-muted-foreground">This month</div>
            <div className="font-display text-2xl tabular-nums leading-none mt-1">
              {formatMoney(Math.round(currentMonth.usd), "USD", "USD")}
              {currentMonth.mxn > 0 && (
                <span className="text-base text-muted-foreground ml-1">
                  + {formatMoney(Math.round(currentMonth.mxn), "MXN", "MXN")}
                </span>
              )}
            </div>
          </div>
        </div>

        <div className="h-56 mt-5 -mx-2">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={monthlyData} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" vertical={false} />
              <XAxis
                dataKey="label"
                tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 11 }}
                axisLine={false}
                tickLine={false}
              />
              <YAxis
                tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 11 }}
                axisLine={false}
                tickLine={false}
                tickFormatter={(v) => `$${Math.round(Number(v))}`}
              />
              <Tooltip
                cursor={{ fill: "hsl(var(--muted) / 0.5)" }}
                contentStyle={{
                  background: "hsl(var(--card))",
                  border: "none",
                  borderRadius: 12,
                  boxShadow: "var(--shadow-card)",
                  fontSize: 12,
                }}
                formatter={(value: number, name: string, ctx) => {
                  if (name === "USD") return [formatMoney(Math.round(value), "USD", "USD"), "USD payments"];
                  // For MXN we render USD-equivalent height; show original MXN in tooltip via payload
                  const row = ctx?.payload as { mxn?: number } | undefined;
                  const mxn = row?.mxn ?? 0;
                  return [`${formatMoney(Math.round(mxn), "MXN", "MXN")} (≈ ${formatMoney(Math.round(value), "USD", "USD")})`, "MXN payments"];
                }}
              />
              <Bar dataKey="usd" stackId="a" name="USD" fill="hsl(var(--primary))" radius={[0, 0, 0, 0]} />
              <Bar dataKey="mxnUsd" stackId="a" name="MXN" fill="hsl(var(--accent-foreground))" radius={[8, 8, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>

        <div className="flex items-center gap-4 mt-2 text-[11px] text-muted-foreground">
          <span className="inline-flex items-center gap-1.5">
            <span className="h-2.5 w-2.5 rounded-sm" style={{ background: "hsl(var(--primary))" }} /> USD
          </span>
          <span className="inline-flex items-center gap-1.5">
            <span className="h-2.5 w-2.5 rounded-sm" style={{ background: "hsl(var(--accent-foreground))" }} /> MXN (USD-equiv)
          </span>
        </div>
      </Card>

      {/* Per-card breakdown */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
        {cardData.map((c) => (
          <PerCardTile key={c.config.label} data={c} onOpen={() => setDrawerCard(c)} />
        ))}
      </div>

      {/* Drawer */}
      <Drawer open={!!drawerCard} onOpenChange={(o) => !o && setDrawerCard(null)}>
        <DrawerContent className="max-h-[85vh]">
          <DrawerHeader>
            <DrawerTitle className="font-display text-2xl flex items-center gap-2">
              <span
                className="h-9 w-9 rounded-2xl flex items-center justify-center text-base"
                style={{ background: `hsl(${drawerCard?.config.hue ?? 215} 50% 92%)` }}
              >
                {drawerCard?.config.emoji}
              </span>
              {drawerCard?.config.label}
            </DrawerTitle>
            <DrawerDescription>
              {drawerCard?.payments.length ?? 0} payments ·{" "}
              YTD {formatMoney(Math.round(drawerCard?.ytdNative ?? 0), drawerCard?.ytdCurrency ?? "USD", drawerCard?.ytdCurrency as "USD" | "MXN" ?? "USD")}
            </DrawerDescription>
          </DrawerHeader>
          <ScrollArea className="px-4 pb-6 max-h-[60vh]">
            {drawerCard && drawerCard.payments.length === 0 ? (
              <div className="text-center text-sm text-muted-foreground py-8">
                No payments logged yet for this card.
              </div>
            ) : (
              <div className="divide-y divide-border">
                {drawerCard?.payments.map((p) => {
                  const d = new Date(p.paid_date + "T00:00:00");
                  return (
                    <div key={p.id} className="flex items-center justify-between py-3">
                      <div>
                        <div className="text-sm font-medium">
                          {d.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}
                        </div>
                        <div className="text-[11px] text-muted-foreground">
                          {d.toLocaleDateString("en-US", { month: "long", year: "numeric" })}
                          {p.notes && <> · {p.notes}</>}
                        </div>
                      </div>
                      <div className="text-sm font-semibold tabular-nums">
                        {formatMoney(p.amount_paid ?? 0, p.currency ?? "USD", (p.currency as "USD" | "MXN") ?? "USD")}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </ScrollArea>
        </DrawerContent>
      </Drawer>
    </section>
  );
}

function PerCardTile({
  data,
  onOpen,
}: {
  data: {
    config: CardConfig;
    bill: Bill | null;
    thisMonthPaid: number;
    thisMonthCurrency: string;
    last3: { label: string; value: number }[];
    ytd: number;
    ytdNative: number;
    ytdCurrency: string;
  };
  onOpen: () => void;
}) {
  const { config, bill, thisMonthPaid, thisMonthCurrency, last3, ytdNative, ytdCurrency } = data;
  const accent = `hsl(${config.hue} 55% 50%)`;
  const tint = `hsl(${config.hue} 55% 94%)`;
  const tintDark = `hsl(${config.hue} 50% 85%)`;
  const max = Math.max(1, ...last3.map((p) => p.value));

  return (
    <button
      type="button"
      onClick={onOpen}
      disabled={!bill}
      className="text-left group focus:outline-none focus:ring-2 focus:ring-ring rounded-3xl"
    >
      <Card
        className="rounded-3xl border-0 shadow-soft bg-card p-4 h-full transition-shadow group-hover:shadow-card"
        style={{ borderTop: `3px solid ${accent}` }}
      >
        <div className="flex items-center gap-2">
          <div
            className="h-9 w-9 rounded-2xl flex items-center justify-center text-base shrink-0"
            style={{ background: tint }}
          >
            {config.emoji}
          </div>
          <div className="min-w-0">
            <div className="text-sm font-medium truncate">{config.label}</div>
            <div className="text-[10px] uppercase tracking-widest text-muted-foreground">
              {bill ? thisMonthCurrency : "Not configured"}
            </div>
          </div>
        </div>

        <div className="mt-3">
          <div className="text-[10px] uppercase tracking-widest text-muted-foreground">This month</div>
          <div className="font-display text-xl tabular-nums leading-tight mt-0.5">
            {!bill ? (
              <span className="text-sm text-muted-foreground font-sans">—</span>
            ) : thisMonthPaid > 0 ? (
              formatMoney(Math.round(thisMonthPaid), thisMonthCurrency, thisMonthCurrency as "USD" | "MXN")
            ) : (
              <span className="text-sm text-muted-foreground font-sans">Not paid yet</span>
            )}
          </div>
        </div>

        {/* Sparkline */}
        <div className="mt-3 flex items-end gap-1.5 h-10">
          {last3.map((p) => (
            <div key={p.label} className="flex-1 flex flex-col items-center gap-1">
              <div className="w-full flex-1 flex items-end">
                <div
                  className="w-full rounded-t-md transition-all"
                  style={{
                    height: `${(p.value / max) * 100}%`,
                    background: p.value > 0 ? accent : tintDark,
                    minHeight: 2,
                  }}
                />
              </div>
              <div className="text-[9px] text-muted-foreground">{p.label}</div>
            </div>
          ))}
        </div>

        <div className="mt-3 pt-3 border-t border-border flex items-baseline justify-between">
          <span className="text-[10px] uppercase tracking-widest text-muted-foreground">YTD</span>
          <span className="text-sm font-semibold tabular-nums">
            {bill
              ? formatMoney(Math.round(ytdNative), ytdCurrency, ytdCurrency as "USD" | "MXN")
              : "—"}
          </span>
        </div>
      </Card>
    </button>
  );
}
