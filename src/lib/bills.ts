// Bills + bill_payments data layer.
// Schema mirrors Supabase tables `bills` and `bill_payments`.

import { supabase } from "@/lib/supabase";

export type BillCurrency = "USD" | "MXN";
export type BillType = "recurring" | "one_time";
export type BillCategory =
  | "rent"
  | "credit_card"
  | "subscription"
  | "utility"
  | "phone"
  | "other";

export interface Bill {
  id: string;
  name: string;
  emoji: string | null;
  category: BillCategory;
  amount: number | null;
  currency: BillCurrency;
  type: BillType;
  recurrence: string | null;
  due_day: number | null;
  due_day_end_of_month: boolean;
  due_date: string | null; // ISO date for one_time
  is_active: boolean;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

export interface BillPayment {
  id: string;
  bill_id: string;
  amount_paid: number | null;
  paid_date: string; // ISO date
  due_date: string | null; // expected due date this payment satisfies
  currency: BillCurrency | null;
  status: string;
  notes: string | null;
  created_at: string;
}

export interface NewBillInput {
  name: string;
  emoji?: string | null;
  category: BillCategory;
  amount?: number | null;
  currency: BillCurrency;
  type: BillType;
  due_day?: number | null;
  due_day_end_of_month?: boolean;
  due_date?: string | null;
  notes?: string | null;
}

export const BILL_CATEGORIES: { key: BillCategory; label: string; emoji: string }[] = [
  { key: "rent", label: "Rent", emoji: "🏠" },
  { key: "credit_card", label: "Credit Card", emoji: "💳" },
  { key: "subscription", label: "Subscription", emoji: "📺" },
  { key: "utility", label: "Utility", emoji: "💡" },
  { key: "phone", label: "Phone", emoji: "📱" },
  { key: "other", label: "Other", emoji: "📦" },
];

export function getBillCategoryMeta(c: BillCategory) {
  return BILL_CATEGORIES.find((x) => x.key === c) ?? BILL_CATEGORIES[BILL_CATEGORIES.length - 1];
}

// ---------- Due date math ----------

function lastDayOfMonth(year: number, month: number): Date {
  return new Date(year, month + 1, 0);
}

/** Return the next expected due date for a bill, ignoring payment status. */
export function getNextDueDate(bill: Bill, today: Date = new Date()): Date | null {
  const t = new Date(today.getFullYear(), today.getMonth(), today.getDate());
  if (bill.type === "one_time") {
    return bill.due_date ? new Date(bill.due_date + "T00:00:00") : null;
  }
  // recurring
  if (bill.due_day_end_of_month) {
    return lastDayOfMonth(t.getFullYear(), t.getMonth());
  }
  if (bill.due_day != null) {
    const day = Math.min(bill.due_day, lastDayOfMonth(t.getFullYear(), t.getMonth()).getDate());
    const thisMonth = new Date(t.getFullYear(), t.getMonth(), day);
    if (thisMonth.getTime() >= t.getTime()) return thisMonth;
    const nextMonthLast = lastDayOfMonth(t.getFullYear(), t.getMonth() + 1).getDate();
    return new Date(t.getFullYear(), t.getMonth() + 1, Math.min(bill.due_day, nextMonthLast));
  }
  return null;
}

export function daysUntil(date: Date, today: Date = new Date()): number {
  const t = new Date(today.getFullYear(), today.getMonth(), today.getDate());
  const d = new Date(date.getFullYear(), date.getMonth(), date.getDate());
  return Math.round((d.getTime() - t.getTime()) / (1000 * 60 * 60 * 24));
}

export type BillBucket = "overdue" | "due_soon" | "upcoming";

export function classifyBill(daysRemaining: number): BillBucket {
  if (daysRemaining < 0) return "overdue";
  if (daysRemaining <= 7) return "due_soon";
  return "upcoming";
}

export function isoDate(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

/** Find the latest paid payment that matches the current expected due date. */
export function isBillPaidForDueDate(
  payments: BillPayment[],
  billId: string,
  expectedDue: Date | null,
): boolean {
  if (!expectedDue) return false;
  const target = isoDate(expectedDue);
  return payments.some(
    (p) =>
      p.bill_id === billId &&
      p.status === "paid" &&
      (p.due_date === target ||
        // fallback: paid within ±15 days of expected due date counts as paid
        (p.due_date == null &&
          Math.abs(daysUntil(new Date(p.paid_date + "T00:00:00"), expectedDue)) <= 15)),
  );
}

// ---------- Queries ----------

export async function getBills(): Promise<Bill[]> {
  const { data, error } = await supabase
    .from("bills")
    .select("*")
    .eq("is_active", true)
    .order("name");
  if (error) {
    console.error("getBills", error);
    return [];
  }
  return (data ?? []) as Bill[];
}

export async function getBillPayments(): Promise<BillPayment[]> {
  const { data, error } = await supabase
    .from("bill_payments")
    .select("*")
    .order("paid_date", { ascending: false });
  if (error) {
    console.error("getBillPayments", error);
    return [];
  }
  return (data ?? []) as BillPayment[];
}

export async function createBill(input: NewBillInput): Promise<Bill | null> {
  const payload = {
    name: input.name,
    emoji: input.emoji ?? null,
    category: input.category,
    amount: input.amount ?? null,
    currency: input.currency,
    type: input.type,
    recurrence: input.type === "recurring" ? "monthly" : null,
    due_day: input.type === "recurring" && !input.due_day_end_of_month ? input.due_day ?? null : null,
    due_day_end_of_month: input.type === "recurring" ? !!input.due_day_end_of_month : false,
    due_date: input.type === "one_time" ? input.due_date ?? null : null,
    is_active: true,
    notes: input.notes ?? null,
  };
  const { data, error } = await supabase.from("bills").insert(payload).select("*").single();
  if (error) {
    console.error("createBill", error);
    return null;
  }
  return data as Bill;
}

export async function markBillPaid(args: {
  bill_id: string;
  amount_paid: number | null;
  due_date: string | null;
  paid_date?: string | null;
  currency?: BillCurrency | null;
  notes?: string | null;
}): Promise<BillPayment | null> {
  const payload = {
    bill_id: args.bill_id,
    amount_paid: args.amount_paid,
    paid_date: args.paid_date ?? isoDate(new Date()),
    due_date: args.due_date,
    currency: args.currency ?? null,
    status: "paid",
    notes: args.notes ?? null,
  };
  const { data, error } = await supabase
    .from("bill_payments")
    .insert(payload)
    .select("*")
    .single();
  if (error) {
    console.error("markBillPaid", error);
    return null;
  }
  return data as BillPayment;
}
