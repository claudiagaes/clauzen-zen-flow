// Types mirror the Supabase schema exactly.
// Swap getExpenses() etc. with real Supabase queries when you wire credentials.

export type Currency = "EUR" | "USD" | "GBP";

export interface Expense {
  id: string;
  date: string; // ISO
  description: string;
  total_amount: number;
  currency: Currency;
  category: string;
  paid_by: string;
  is_shared: boolean;
  event_tag: string | null;
  splitwise_expense_id: string | null;
  splitwise_group_id: string | null;
  notes: string | null;
  receipt_image_url: string | null;
  created_at: string;
}

export interface ExpenseSplit {
  id: string;
  expense_id: string;
  person_name: string;
  amount_owed: number;
  is_paid: boolean;
}

export interface ExpenseItem {
  id: string;
  expense_id: string;
  item_name: string;
  amount: number;
  assigned_to: string | null;
}

export const CATEGORIES = [
  { key: "Food & Dining", emoji: "🍽️", token: "cat-food" },
  { key: "Drinks", emoji: "🍺", token: "cat-drinks" },
  { key: "Groceries", emoji: "🛒", token: "cat-groceries" },
  { key: "Shopping", emoji: "🛍️", token: "cat-shopping" },
  { key: "Transport", emoji: "🚗", token: "cat-transport" },
  { key: "Travel", emoji: "✈️", token: "cat-travel" },
  { key: "Rent", emoji: "🏠", token: "cat-rent" },
  { key: "Bills", emoji: "💡", token: "cat-bills" },
  { key: "Entertainment", emoji: "🎬", token: "cat-entertainment" },
  { key: "Health", emoji: "💊", token: "cat-health" },
  { key: "Education", emoji: "🎓", token: "cat-education" },
  { key: "Pets", emoji: "🐾", token: "cat-pets" },
  { key: "Home", emoji: "🧹", token: "cat-home" },
  { key: "Gifts", emoji: "🎁", token: "cat-gifts" },
  { key: "Other", emoji: "📦", token: "cat-other" },
] as const;

export function getCategoryMeta(category: string) {
  return (
    CATEGORIES.find((c) => c.key.toLowerCase() === category.toLowerCase()) ??
    CATEGORIES[CATEGORIES.length - 1]
  );
}

// ---------- Mock dataset (shaped like Supabase rows) ----------

const today = new Date();
function daysAgo(n: number): string {
  const d = new Date(today);
  d.setDate(d.getDate() - n);
  return d.toISOString();
}

const PEOPLE = ["Claudia", "Marco", "Sofia", "Alex", "Priya", "Jonas"];

let _eid = 0;
const eid = () => `exp_${++_eid}`;
let _sid = 0;
const sid = () => `spl_${++_sid}`;
let _iid = 0;
const iid = () => `itm_${++_iid}`;

interface Seed {
  d: number;
  desc: string;
  amount: number;
  cat: string;
  paid_by?: string;
  shared?: string[];
  event?: string | null;
  notes?: string | null;
  items?: { name: string; amount: number; to?: string | null }[];
  currency?: Currency;
}

const SEEDS: Seed[] = [
  // This month
  { d: 1, desc: "Sushi Omakase", amount: 84.5, cat: "Food & Dining", paid_by: "Claudia", shared: ["Marco"], event: "Date Night" },
  { d: 2, desc: "Mercadona weekly", amount: 62.3, cat: "Groceries", paid_by: "Claudia", notes: "Veggies + pantry restock" },
  { d: 3, desc: "Uber to campus", amount: 11.4, cat: "Transport", paid_by: "Claudia" },
  { d: 4, desc: "IESE coffee w/ classmates", amount: 8.2, cat: "Drinks", paid_by: "Claudia" },
  { d: 5, desc: "Lisbon weekend — Airbnb", amount: 312.0, cat: "Travel", paid_by: "Claudia", shared: ["Sofia", "Priya", "Alex"], event: "Lisbon Trip" },
  { d: 5, desc: "TAP flight BCN → LIS", amount: 148.0, cat: "Travel", paid_by: "Claudia", event: "Lisbon Trip" },
  { d: 6, desc: "Pastéis de Belém", amount: 14.0, cat: "Food & Dining", paid_by: "Sofia", shared: ["Claudia", "Priya", "Alex"], event: "Lisbon Trip" },
  { d: 6, desc: "Time Out Market dinner", amount: 96.5, cat: "Food & Dining", paid_by: "Claudia", shared: ["Sofia", "Priya", "Alex"], event: "Lisbon Trip",
    items: [
      { name: "Bifana", amount: 12, to: "Claudia" },
      { name: "Octopus rice", amount: 28, to: "Sofia" },
      { name: "Wine bottle", amount: 32, to: null },
      { name: "Dessert sharing", amount: 24.5, to: null },
    ]
  },
  { d: 7, desc: "Tram & metro passes", amount: 18.0, cat: "Transport", paid_by: "Alex", shared: ["Claudia"], event: "Lisbon Trip" },
  { d: 8, desc: "Spotify Family", amount: 17.99, cat: "Bills", paid_by: "Claudia", shared: ["Marco", "Sofia"] },
  { d: 9, desc: "Yoga studio class pack", amount: 89.0, cat: "Health", paid_by: "Claudia" },
  { d: 10, desc: "Zara linen pieces", amount: 124.9, cat: "Shopping", paid_by: "Claudia" },
  { d: 11, desc: "Cinema — Dune Part Two", amount: 22.0, cat: "Entertainment", paid_by: "Marco", shared: ["Claudia"], event: "Date Night" },
  { d: 12, desc: "Pharmacy — vitamins", amount: 26.4, cat: "Health", paid_by: "Claudia" },
  { d: 13, desc: "Birthday gift for Sofia", amount: 45.0, cat: "Gifts", paid_by: "Claudia" },
  { d: 14, desc: "MBA case study books", amount: 78.0, cat: "Education", paid_by: "Claudia" },
  { d: 15, desc: "Apartment rent", amount: 1180.0, cat: "Rent", paid_by: "Claudia", notes: "April" },
  { d: 16, desc: "Endesa electricity", amount: 64.2, cat: "Bills", paid_by: "Claudia", shared: ["Marco"] },
  { d: 17, desc: "Brunch at Caravelle", amount: 38.0, cat: "Food & Dining", paid_by: "Priya", shared: ["Claudia"] },
  { d: 18, desc: "Wine tasting Penedès", amount: 72.0, cat: "Drinks", paid_by: "Claudia", shared: ["Marco", "Jonas"], event: "Wine Weekend" },
  { d: 19, desc: "Pet food for Mochi", amount: 34.5, cat: "Pets", paid_by: "Claudia" },
  { d: 20, desc: "Cleaning supplies", amount: 19.8, cat: "Home", paid_by: "Claudia" },
  { d: 21, desc: "Paris ICE — Eurostar", amount: 142.0, cat: "Travel", paid_by: "Claudia", event: "Paris Conference" },
  { d: 22, desc: "Le Marais bistro", amount: 88.0, cat: "Food & Dining", paid_by: "Claudia", shared: ["Jonas"], event: "Paris Conference" },
  { d: 23, desc: "Notion subscription", amount: 9.99, cat: "Bills", paid_by: "Claudia" },
  // Previous month (for trend chart)
  { d: 35, desc: "Apartment rent", amount: 1180, cat: "Rent", paid_by: "Claudia" },
  { d: 38, desc: "Mercadona", amount: 71, cat: "Groceries", paid_by: "Claudia" },
  { d: 40, desc: "Tapas crawl Gracia", amount: 65, cat: "Food & Dining", paid_by: "Claudia", shared: ["Marco"] },
  { d: 42, desc: "Therapy session", amount: 80, cat: "Health", paid_by: "Claudia" },
  { d: 45, desc: "Renfe to Madrid", amount: 95, cat: "Travel", paid_by: "Claudia", event: "Madrid Visit" },
  { d: 47, desc: "Prado tickets", amount: 24, cat: "Entertainment", paid_by: "Claudia", event: "Madrid Visit" },
  { d: 50, desc: "Cazadores cocktails", amount: 48, cat: "Drinks", paid_by: "Claudia", shared: ["Sofia"] },
  { d: 55, desc: "MBA elective books", amount: 110, cat: "Education", paid_by: "Claudia" },
  { d: 58, desc: "Endesa", amount: 71, cat: "Bills", paid_by: "Claudia", shared: ["Marco"] },
  { d: 60, desc: "Massimo Dutti coat", amount: 189, cat: "Shopping", paid_by: "Claudia" },
  // Two months ago
  { d: 65, desc: "Rent", amount: 1180, cat: "Rent", paid_by: "Claudia" },
  { d: 70, desc: "Groceries", amount: 220, cat: "Groceries", paid_by: "Claudia" },
  { d: 72, desc: "Berlin trip flights", amount: 230, cat: "Travel", paid_by: "Claudia", event: "Berlin Trip" },
  { d: 74, desc: "Berlin Airbnb", amount: 280, cat: "Travel", paid_by: "Claudia", shared: ["Marco", "Jonas"], event: "Berlin Trip" },
  { d: 76, desc: "Berghain night", amount: 60, cat: "Entertainment", paid_by: "Claudia", event: "Berlin Trip" },
  { d: 80, desc: "Bills", amount: 95, cat: "Bills", paid_by: "Claudia" },
  { d: 85, desc: "Dining out", amount: 180, cat: "Food & Dining", paid_by: "Claudia" },
  // Three months
  { d: 95, desc: "Rent", amount: 1180, cat: "Rent", paid_by: "Claudia" },
  { d: 100, desc: "Groceries", amount: 195, cat: "Groceries", paid_by: "Claudia" },
  { d: 105, desc: "Holiday gifts", amount: 240, cat: "Gifts", paid_by: "Claudia" },
];

const expenses: Expense[] = [];
const splits: ExpenseSplit[] = [];
const items: ExpenseItem[] = [];

for (const s of SEEDS) {
  const id = eid();
  const isShared = !!(s.shared && s.shared.length);
  expenses.push({
    id,
    date: daysAgo(s.d),
    description: s.desc,
    total_amount: s.amount,
    currency: s.currency ?? "EUR",
    category: s.cat,
    paid_by: s.paid_by ?? "Claudia",
    is_shared: isShared,
    event_tag: s.event ?? null,
    splitwise_expense_id: isShared ? `sw_${id}` : null,
    splitwise_group_id: s.event ? `grp_${s.event.replace(/\s/g, "_")}` : null,
    notes: s.notes ?? null,
    receipt_image_url: null,
    created_at: daysAgo(s.d),
  });
  if (isShared && s.shared) {
    const everyone = [s.paid_by ?? "Claudia", ...s.shared];
    const per = +(s.amount / everyone.length).toFixed(2);
    for (const p of s.shared) {
      splits.push({
        id: sid(),
        expense_id: id,
        person_name: p,
        amount_owed: per,
        is_paid: Math.random() > 0.6,
      });
    }
  }
  if (s.items) {
    for (const it of s.items) {
      items.push({
        id: iid(),
        expense_id: id,
        item_name: it.name,
        amount: it.amount,
        assigned_to: it.to ?? null,
      });
    }
  }
}

// ---------- Public API ----------

export async function getExpenses(): Promise<Expense[]> {
  return [...expenses].sort((a, b) => +new Date(b.date) - +new Date(a.date));
}
export async function getSplits(): Promise<ExpenseSplit[]> {
  return splits;
}
export async function getItems(): Promise<ExpenseItem[]> {
  return items;
}
export async function getSplitsForExpense(expenseId: string): Promise<ExpenseSplit[]> {
  return splits.filter((s) => s.expense_id === expenseId);
}
export async function getItemsForExpense(expenseId: string): Promise<ExpenseItem[]> {
  return items.filter((i) => i.expense_id === expenseId);
}

export const PEOPLE_LIST = PEOPLE;
