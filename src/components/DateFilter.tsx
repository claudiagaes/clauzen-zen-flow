import { useState } from "react";
import { Calendar as CalendarIcon, X } from "lucide-react";
import { format } from "date-fns";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { cn } from "@/lib/utils";
import { startOfMonth, endOfMonth } from "@/lib/format";

export type DateRange = { from: Date; to: Date } | null;

export type DatePresetKey =
  | "all"
  | "this-month"
  | "last-month"
  | "last-7"
  | "last-30"
  | "this-year"
  | "custom";

const PRESETS: { key: Exclude<DatePresetKey, "custom">; label: string }[] = [
  { key: "all", label: "All time" },
  { key: "this-month", label: "This month" },
  { key: "last-month", label: "Last month" },
  { key: "last-7", label: "Last 7 days" },
  { key: "last-30", label: "Last 30 days" },
  { key: "this-year", label: "This year" },
];

export function presetToRange(key: Exclude<DatePresetKey, "custom" | "all">): DateRange {
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59);
  switch (key) {
    case "this-month":
      return { from: startOfMonth(now), to: endOfMonth(now) };
    case "last-month": {
      const lm = new Date(now.getFullYear(), now.getMonth() - 1, 1);
      return { from: startOfMonth(lm), to: endOfMonth(lm) };
    }
    case "last-7": {
      const from = new Date(now);
      from.setDate(from.getDate() - 6);
      from.setHours(0, 0, 0, 0);
      return { from, to: today };
    }
    case "last-30": {
      const from = new Date(now);
      from.setDate(from.getDate() - 29);
      from.setHours(0, 0, 0, 0);
      return { from, to: today };
    }
    case "this-year":
      return {
        from: new Date(now.getFullYear(), 0, 1),
        to: new Date(now.getFullYear(), 11, 31, 23, 59, 59),
      };
  }
}

interface Props {
  preset: DatePresetKey;
  range: DateRange;
  onChange: (preset: DatePresetKey, range: DateRange) => void;
}

export function DateFilter({ preset, range, onChange }: Props) {
  const [open, setOpen] = useState(false);
  const [draft, setDraft] = useState<{ from?: Date; to?: Date }>({
    from: range?.from,
    to: range?.to,
  });

  const activeLabel = (() => {
    if (preset === "all") return "All time";
    if (preset === "custom" && range) {
      return `${format(range.from, "MMM d")} – ${format(range.to, "MMM d, yyyy")}`;
    }
    const found = PRESETS.find((p) => p.key === preset);
    return found?.label ?? "All time";
  })();

  return (
    <div className="flex flex-wrap items-center gap-2">
      <div className="inline-flex flex-wrap items-center gap-1 bg-secondary rounded-2xl p-1">
        {PRESETS.map((p) => (
          <button
            key={p.key}
            onClick={() => {
              if (p.key === "all") onChange("all", null);
              else onChange(p.key, presetToRange(p.key));
            }}
            className={cn(
              "px-3 py-1.5 text-xs rounded-xl transition-colors",
              preset === p.key
                ? "bg-card text-foreground shadow-soft"
                : "text-muted-foreground hover:text-foreground",
            )}
          >
            {p.label}
          </button>
        ))}

        <Popover open={open} onOpenChange={setOpen}>
          <PopoverTrigger asChild>
            <button
              className={cn(
                "px-3 py-1.5 text-xs rounded-xl transition-colors inline-flex items-center gap-1.5",
                preset === "custom"
                  ? "bg-card text-foreground shadow-soft"
                  : "text-muted-foreground hover:text-foreground",
              )}
            >
              <CalendarIcon className="h-3.5 w-3.5" />
              Custom
            </button>
          </PopoverTrigger>
          <PopoverContent className="w-auto p-0 rounded-2xl border-0 shadow-card bg-popover" align="start">
            <Calendar
              mode="range"
              selected={{ from: draft.from, to: draft.to }}
              onSelect={(r) => {
                setDraft({ from: r?.from, to: r?.to });
                if (r?.from && r?.to) {
                  const to = new Date(r.to);
                  to.setHours(23, 59, 59, 999);
                  onChange("custom", { from: r.from, to });
                  setOpen(false);
                }
              }}
              numberOfMonths={2}
              initialFocus
              className={cn("p-3 pointer-events-auto")}
            />
          </PopoverContent>
        </Popover>
      </div>

      <div className="text-xs text-muted-foreground inline-flex items-center gap-1.5">
        <span className="hidden sm:inline">·</span>
        <span>{activeLabel}</span>
        {preset !== "all" && (
          <button
            onClick={() => onChange("all", null)}
            className="hover:text-foreground p-0.5 rounded-md"
            aria-label="Clear date filter"
          >
            <X className="h-3 w-3" />
          </button>
        )}
      </div>
    </div>
  );
}
