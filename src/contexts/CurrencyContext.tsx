import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import {
  convertAmount,
  formatMoney as baseFormatMoney,
  formatOriginal as baseFormatOriginal,
  isConverted as baseIsConverted,
  type DisplayCurrency,
} from "@/lib/format";

const STORAGE_KEY = "clauzen.displayCurrency";

interface CurrencyContextValue {
  /** The user-selected display currency (USD or MXN). */
  display: DisplayCurrency;
  setDisplay: (next: DisplayCurrency) => void;
  /** Convert an amount from its source currency into the active display currency. */
  convert: (amount: number, sourceCurrency: string) => number;
  /** Format an amount in the active display currency. Pass the source currency for conversion. */
  format: (amount: number, sourceCurrency?: string) => string;
  /** Format an amount in its own native currency (no conversion). */
  formatNative: (amount: number, currency: string) => string;
  /** True if the source currency differs from the active display currency. */
  isConverted: (sourceCurrency: string) => boolean;
}

const CurrencyContext = createContext<CurrencyContextValue | null>(null);

function readInitial(): DisplayCurrency {
  if (typeof window === "undefined") return "USD";
  const v = window.localStorage.getItem(STORAGE_KEY);
  return v === "MXN" || v === "USD" ? v : "USD";
}

export function CurrencyProvider({ children }: { children: ReactNode }) {
  const [display, setDisplayState] = useState<DisplayCurrency>(readInitial);

  useEffect(() => {
    try {
      window.localStorage.setItem(STORAGE_KEY, display);
    } catch {
      /* ignore storage errors (private mode, etc.) */
    }
  }, [display]);

  const setDisplay = useCallback((next: DisplayCurrency) => setDisplayState(next), []);

  const value = useMemo<CurrencyContextValue>(
    () => ({
      display,
      setDisplay,
      convert: (amount, source) => convertAmount(amount, source, display),
      format: (amount, source) => baseFormatMoney(amount, source ?? display, display),
      formatNative: (amount, currency) => baseFormatOriginal(amount, currency),
      isConverted: (source) => baseIsConverted(source, display),
    }),
    [display, setDisplay],
  );

  return <CurrencyContext.Provider value={value}>{children}</CurrencyContext.Provider>;
}

export function useCurrency(): CurrencyContextValue {
  const ctx = useContext(CurrencyContext);
  if (!ctx) throw new Error("useCurrency must be used inside <CurrencyProvider>");
  return ctx;
}
