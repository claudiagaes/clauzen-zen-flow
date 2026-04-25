// Display currency for the whole app.
export const DISPLAY_CURRENCY = "USD";

// Static FX rates → USD. Approximate; good enough for a personal dashboard.
// Update here if you want different rates.
const TO_USD: Record<string, number> = {
  USD: 1,
  EUR: 1.08,
  GBP: 1.27,
};

export function toDisplayAmount(amount: number, currency: string = "USD") {
  const rate = TO_USD[currency?.toUpperCase()] ?? 1;
  return amount * rate;
}

export function formatMoney(amount: number, currency: string = DISPLAY_CURRENCY) {
  // Convert to display currency first, then format.
  const value =
    currency.toUpperCase() === DISPLAY_CURRENCY
      ? amount
      : toDisplayAmount(amount, currency);
  try {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: DISPLAY_CURRENCY,
      maximumFractionDigits: value % 1 === 0 ? 0 : 2,
    }).format(value);
  } catch {
    return `${DISPLAY_CURRENCY} ${value.toFixed(2)}`;
  }
}

export function formatDate(iso: string, opts: Intl.DateTimeFormatOptions = { month: "short", day: "numeric" }) {
  return new Date(iso).toLocaleDateString("en-US", opts);
}

export function startOfMonth(d: Date) {
  return new Date(d.getFullYear(), d.getMonth(), 1);
}
export function endOfMonth(d: Date) {
  return new Date(d.getFullYear(), d.getMonth() + 1, 0, 23, 59, 59);
}
export function monthLabel(d: Date) {
  return d.toLocaleDateString("en-US", { month: "long", year: "numeric" });
}
