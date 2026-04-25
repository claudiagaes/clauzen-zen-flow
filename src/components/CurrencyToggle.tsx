import { useCurrency } from "@/contexts/CurrencyContext";
import { cn } from "@/lib/utils";
import type { DisplayCurrency } from "@/lib/format";

const OPTIONS: { code: DisplayCurrency; flag: string; label: string }[] = [
  { code: "USD", flag: "🇺🇸", label: "USD" },
  { code: "MXN", flag: "🇲🇽", label: "MXN" },
];

export function CurrencyToggle() {
  const { display, setDisplay } = useCurrency();
  return (
    <div
      role="radiogroup"
      aria-label="Display currency"
      className="inline-flex items-center gap-0.5 bg-secondary rounded-full p-0.5"
    >
      {OPTIONS.map((o) => {
        const active = display === o.code;
        return (
          <button
            key={o.code}
            role="radio"
            aria-checked={active}
            onClick={() => setDisplay(o.code)}
            className={cn(
              "inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-medium transition-colors leading-none",
              active
                ? "bg-card text-foreground shadow-soft"
                : "text-muted-foreground hover:text-foreground",
            )}
          >
            <span aria-hidden className="text-sm leading-none">{o.flag}</span>
            <span>{o.label}</span>
          </button>
        );
      })}
    </div>
  );
}
