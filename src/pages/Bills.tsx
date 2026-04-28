import { useEffect, useMemo, useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  classifyBill,
  daysUntil,
  getBillCategoryMeta,
  getBillPayments,
  getBills,
  getNextDueDate,
  isBillPaidForDueDate,
  type Bill,
  type BillBucket,
  type BillPayment,
} from "@/lib/bills";
import { convertAmount, formatMoney, formatOriginal } from "@/lib/format";
import { AddBillDialog } from "@/components/AddBillDialog";
import { MarkBillPaidDialog } from "@/components/MarkBillPaidDialog";
import { EditBillDialog } from "@/components/EditBillDialog";
import { CreditCardsSection } from "@/components/CreditCardsSection";
import { Check, ChevronDown, ChevronRight, Pencil, Plus } from "lucide-react";

interface ResolvedBill {
  bill: Bill;
  nextDue: Date | null;
  daysRemaining: number | null;
  bucket: BillBucket | "no_due";
  paid: boolean;
}

const BUCKETS: { key: BillBucket; label: string; emoji: string }[] = [
  { key: "overdue", label: "Overdue", emoji: "🔴" },
  { key: "due_soon", label: "Due Soon", emoji: "🟡" },
  { key: "upcoming", label: "Upcoming", emoji: "⚪" },
];

export default function Bills() {
  const [bills, setBills] = useState<Bill[]>([]);
  const [archivedBills, setArchivedBills] = useState<Bill[]>([]);
  const [payments, setPayments] = useState<BillPayment[]>([]);
  const [loading, setLoading] = useState(true);
  const [addOpen, setAddOpen] = useState(false);
  const [payOpen, setPayOpen] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const [activeBill, setActiveBill] = useState<Bill | null>(null);
  const [activeDue, setActiveDue] = useState<Date | null>(null);
  const [editBill, setEditBill] = useState<Bill | null>(null);
  const [archivedOpen, setArchivedOpen] = useState(false);

  const refresh = async () => {
    setLoading(true);
    const [all, p] = await Promise.all([getBills({ includeArchived: true }), getBillPayments()]);
    setBills(all.filter((b) => b.is_active));
    setArchivedBills(all.filter((b) => !b.is_active));
    setPayments(p);
    setLoading(false);
  };

  useEffect(() => {
    refresh();
  }, []);

  const resolved: ResolvedBill[] = useMemo(() => {
    const today = new Date();
    return bills.map((bill) => {
      const nextDue = getNextDueDate(bill, today);
      const paid = isBillPaidForDueDate(payments, bill.id, nextDue);
      const daysRemaining = nextDue ? daysUntil(nextDue, today) : null;
      const bucket: BillBucket | "no_due" =
        daysRemaining == null ? "no_due" : classifyBill(daysRemaining);
      return { bill, nextDue, daysRemaining, bucket, paid };
    });
  }, [bills, payments]);

  // Hide paid bills from active sections
  const grouped: Record<BillBucket, ResolvedBill[]> = {
    overdue: resolved.filter((r) => !r.paid && r.bucket === "overdue"),
    due_soon: resolved.filter((r) => !r.paid && r.bucket === "due_soon"),
    upcoming: resolved.filter((r) => !r.paid && r.bucket === "upcoming"),
  };

  // Bills paid for the current cycle (still useful to surface)
  const paidThisCycle = resolved.filter((r) => r.paid);

  // This month's bills total in USD (only known amounts)
  const thisMonthTotalUsd = useMemo(() => {
    const today = new Date();
    const monthStart = new Date(today.getFullYear(), today.getMonth(), 1);
    const monthEnd = new Date(today.getFullYear(), today.getMonth() + 1, 0);
    let total = 0;
    for (const r of resolved) {
      if (r.bill.amount == null || !r.nextDue) continue;
      if (r.nextDue >= monthStart && r.nextDue <= monthEnd) {
        total += convertAmount(r.bill.amount, r.bill.currency, "USD");
      }
    }
    return total;
  }, [resolved]);

  const variableBills = bills.filter((b) => b.amount == null);

  const openPay = (bill: Bill, due: Date | null) => {
    setActiveBill(bill);
    setActiveDue(due);
    setPayOpen(true);
  };

  const openEdit = (bill: Bill) => {
    setEditBill(bill);
    setEditOpen(true);
  };

  return (
    <div className="space-y-8 pt-4 fade-in">
      {/* Header */}
      <section className="flex items-start justify-between flex-wrap gap-4 rise-in">
        <div>
          <h1 className="font-display text-3xl md:text-4xl text-foreground">
            Bills & Deadlines <span className="inline-block">📅</span>
          </h1>
          <p className="text-muted-foreground mt-2">A calm overview of what's due and when.</p>
        </div>
        <Button onClick={() => setAddOpen(true)} className="rounded-2xl">
          <Plus className="h-4 w-4" /> Add bill
        </Button>
      </section>

      {/* Summary widgets */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Card className="rounded-3xl border-0 shadow-card bg-card p-6 rise-in" style={{ animationDelay: "60ms" }}>
          <div className="text-xs uppercase tracking-widest text-muted-foreground">This month's bills</div>
          <div className="font-display text-4xl md:text-5xl mt-2 text-foreground tabular-nums leading-none">
            {formatMoney(Math.round(thisMonthTotalUsd), "USD", "USD")}
          </div>
          <div className="mt-2 text-xs text-muted-foreground">
            Sum of known amounts due this month, converted to USD.
          </div>
        </Card>

        <Card className="rounded-3xl border-0 shadow-card bg-card p-6 rise-in" style={{ animationDelay: "120ms" }}>
          <div className="text-xs uppercase tracking-widest text-muted-foreground">Variable bills</div>
          {variableBills.length === 0 ? (
            <div className="mt-3 text-sm text-muted-foreground">None — every bill has a fixed amount.</div>
          ) : (
            <div className="mt-3 flex flex-wrap gap-2">
              {variableBills.map((b) => (
                <span
                  key={b.id}
                  className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs bg-secondary text-foreground"
                >
                  <span>{b.emoji ?? getBillCategoryMeta(b.category).emoji}</span>
                  {b.name}
                </span>
              ))}
            </div>
          )}
          <div className="mt-3 text-xs text-muted-foreground">
            Amount changes each cycle — log when paid.
          </div>
        </Card>
      </div>

      {/* Credit Cards section */}
      {!loading && <CreditCardsSection bills={bills} payments={payments} />}

      {/* Sections */}
      {loading ? (
        <div className="text-sm text-muted-foreground py-8 text-center">Loading bills…</div>
      ) : bills.length === 0 ? (
        <Card className="rounded-3xl border-0 shadow-soft p-10 text-center">
          <div className="text-3xl mb-2">🧘</div>
          <div className="font-display text-xl mb-1">No bills tracked yet</div>
          <p className="text-sm text-muted-foreground">Add your first bill to start breathing easy.</p>
          <Button onClick={() => setAddOpen(true)} className="mt-4 rounded-2xl">
            <Plus className="h-4 w-4" /> Add bill
          </Button>
        </Card>
      ) : (
        <div className="space-y-8">
          {BUCKETS.map(({ key, label, emoji }) => {
            const items = grouped[key];
            if (items.length === 0) return null;
            return (
              <section key={key} className="rise-in">
                <h2 className="font-display text-xl mb-3 flex items-center gap-2">
                  <span>{emoji}</span> {label}
                  <span className="text-xs font-normal text-muted-foreground">
                    ({items.length})
                  </span>
                </h2>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {items.map((r) => (
                    <BillCard key={r.bill.id} resolved={r} onMarkPaid={() => openPay(r.bill, r.nextDue)} onEdit={() => openEdit(r.bill)} />
                  ))}
                </div>
              </section>
            );
          })}

          {paidThisCycle.length > 0 && (
            <section className="rise-in">
              <h2 className="font-display text-xl mb-3 flex items-center gap-2">
                <span>✅</span> Paid this cycle
                <span className="text-xs font-normal text-muted-foreground">
                  ({paidThisCycle.length})
                </span>
              </h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {paidThisCycle.map((r) => (
                  <BillCard key={r.bill.id} resolved={r} onMarkPaid={() => openPay(r.bill, r.nextDue)} onEdit={() => openEdit(r.bill)} />
                ))}
              </div>
            </section>
          )}

          {grouped.overdue.length === 0 &&
            grouped.due_soon.length === 0 &&
            grouped.upcoming.length === 0 &&
            paidThisCycle.length === resolved.length && (
              <Card className="rounded-3xl border-0 shadow-soft p-8 text-center">
                <div className="text-3xl mb-2">🌿</div>
                <div className="font-display text-lg">All caught up</div>
                <p className="text-sm text-muted-foreground mt-1">Every active bill is paid for this cycle.</p>
              </Card>
            )}
        </div>
      )}

      {archivedBills.length > 0 && (
        <section className="rise-in">
          <button
            onClick={() => setArchivedOpen((v) => !v)}
            className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors"
          >
            {archivedOpen ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
            <span>📦 Archived</span>
            <span className="text-xs">({archivedBills.length})</span>
          </button>
          {archivedOpen && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mt-3 opacity-70">
              {archivedBills.map((bill) => {
                const meta = getBillCategoryMeta(bill.category);
                return (
                  <Card key={bill.id} className="rounded-3xl border-0 shadow-soft bg-card p-4 flex items-center gap-3">
                    <div className="h-12 w-12 rounded-2xl flex items-center justify-center text-xl shrink-0 bg-secondary">
                      {bill.emoji ?? meta.emoji}
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="text-sm font-medium truncate">{bill.name}</div>
                      <div className="text-xs text-muted-foreground mt-0.5">Archived</div>
                    </div>
                    <button
                      onClick={() => openEdit(bill)}
                      className="p-2 rounded-xl hover:bg-secondary transition-colors"
                      aria-label="Edit bill"
                    >
                      <Pencil className="h-4 w-4 text-muted-foreground" />
                    </button>
                  </Card>
                );
              })}
            </div>
          )}
        </section>
      )}

      <AddBillDialog open={addOpen} onOpenChange={setAddOpen} onCreated={refresh} />
      <MarkBillPaidDialog
        open={payOpen}
        onOpenChange={setPayOpen}
        bill={activeBill}
        expectedDue={activeDue}
        onPaid={refresh}
      />
      <EditBillDialog open={editOpen} onOpenChange={setEditOpen} bill={editBill} onSaved={refresh} />
    </div>
  );
}

function BillCard({
  resolved,
  onMarkPaid,
}: {
  resolved: ResolvedBill;
  onMarkPaid: () => void;
}) {
  const { bill, nextDue, daysRemaining, paid } = resolved;
  const meta = getBillCategoryMeta(bill.category);
  const emoji = bill.emoji ?? meta.emoji;

  const dueLabel = nextDue
    ? nextDue.toLocaleDateString("en-US", { month: "short", day: "numeric" })
    : "No date set";

  let daysLabel = "";
  let daysClass = "text-muted-foreground";
  if (daysRemaining != null) {
    if (daysRemaining < 0) {
      daysLabel = `${Math.abs(daysRemaining)}d overdue`;
      daysClass = "text-[hsl(var(--owe))] font-medium";
    } else if (daysRemaining === 0) {
      daysLabel = "Due today";
      daysClass = "text-foreground font-medium";
    } else if (daysRemaining <= 7) {
      daysLabel = `In ${daysRemaining}d`;
      daysClass = "text-foreground font-medium";
    } else {
      daysLabel = `In ${daysRemaining}d`;
    }
  }

  return (
    <Card className="rounded-3xl border-0 shadow-soft bg-card p-4 flex items-center gap-3">
      <div
        className="h-12 w-12 rounded-2xl flex items-center justify-center text-xl shrink-0"
        style={{ backgroundColor: `hsl(var(--cat-${bill.category === "rent" ? "rent" : bill.category === "utility" || bill.category === "phone" ? "bills" : "other"}))` }}
      >
        {emoji}
      </div>
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          <div className="text-sm font-medium truncate">{bill.name}</div>
          {paid && (
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] bg-[hsl(var(--owed-soft))] text-[hsl(var(--owed))] font-medium">
              <Check className="h-3 w-3" /> Paid
            </span>
          )}
        </div>
        <div className="text-xs text-muted-foreground mt-0.5">
          {dueLabel} {daysLabel && <span className={`ml-1 ${daysClass}`}>· {daysLabel}</span>}
        </div>
      </div>
      <div className="text-right shrink-0">
        <div className="text-sm font-semibold tabular-nums">
          {bill.amount != null ? formatOriginal(bill.amount, bill.currency) : "Variable"}
        </div>
        {!paid && (
          <button
            onClick={onMarkPaid}
            className="mt-1 text-[11px] text-primary hover:underline"
          >
            Mark as paid
          </button>
        )}
      </div>
    </Card>
  );
}
