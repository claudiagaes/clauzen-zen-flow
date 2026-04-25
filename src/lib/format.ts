// Currency conversion + formatting helpers.
// The "display currency" is chosen by the user via the global currency toggle.

export type DisplayCurrency = "USD" | "MXN";
export const DEFAULT_DISPLAY_CURRENCY: DisplayCurrency = "USD";

// Fixed rates expressed in MXN per 1 unit of source currency.
// Single source of truth — all conversions route through MXN.
//   1 USD = 18.5 MXN
//   1 EUR = 20 MXN     (so 1 EUR ≈ 1.0811 USD, matches "1 EUR = 1.08 USD")
//   1 GBP = 23.5 MXN   (rough — only used if some legacy data has GBP)
const MXN_PER_UNIT: Record<string, number> = {
  USD: 18.5,
  MXN: 1,
  EUR: 20,
  GBP: 23.5,
};

export function getRate(from: string, to: DisplayCurrency): number {
  const f = (from ?? "USD").toUpperCase();
  const fromMxn = MXN_PER_UNIT[f] ?? MXN_PER_UNIT.USD;
  const toMxn = MXN_PER_UNIT[to] ?? MXN_PER_UNIT.USD;
  return fromMxn / toMxn;
}

/** Convert an amount from its source currency into the chosen display currency. */
export function convertAmount(
  amount: number,
  from: string,
  to: DisplayCurrency = DEFAULT_DISPLAY_CURRENCY,
): number {
  return amount * getRate(from, to);
}

/** Backwards-compat shim — convert into USD by default. */
export function toDisplayAmount(amount: number, currency: string = "USD") {
  return convertAmount(amount, currency, DEFAULT_DISPLAY_CURRENCY);
}

/**
 * Format an amount.
 * - If `sourceCurrency` is given, the value is first converted into `displayCurrency`.
 * - If only one argument is given, the value is treated as already in display currency.
 */
export function formatMoney(
  amount: number,
  sourceCurrency: string = DEFAULT_DISPLAY_CURRENCY,
  displayCurrency: DisplayCurrency = DEFAULT_DISPLAY_CURRENCY,
) {
  const value =
    sourceCurrency.toUpperCase() === displayCurrency
      ? amount
      : convertAmount(amount, sourceCurrency, displayCurrency);
  try {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: displayCurrency,
      maximumFractionDigits: Math.abs(value % 1) < 0.005 ? 0 : 2,
    }).format(value);
  } catch {
    return `${displayCurrency} ${value.toFixed(2)}`;
  }
}

/** Format an amount in its own currency (no conversion). Useful for the "converted from" note. */
export function formatOriginal(amount: number, currency: string) {
  const code = (currency ?? "USD").toUpperCase();
  try {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: code,
      maximumFractionDigits: Math.abs(amount % 1) < 0.005 ? 0 : 2,
    }).format(amount);
  } catch {
    return `${code} ${amount.toFixed(2)}`;
  }
}

/** True when the source currency differs from the active display currency. */
export function isConverted(sourceCurrency: string, displayCurrency: DisplayCurrency) {
  return (sourceCurrency ?? "").toUpperCase() !== displayCurrency;
}

// Legacy export retained for callers that imported the name.
export const DISPLAY_CURRENCY = DEFAULT_DISPLAY_CURRENCY;

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
