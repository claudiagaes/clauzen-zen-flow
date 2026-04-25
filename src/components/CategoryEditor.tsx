import { CATEGORIES, getCategoryMeta, resolveCategory } from "@/lib/data";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

interface Props {
  value: string;
  onChange: (next: string) => void;
  disabled?: boolean;
  className?: string;
}

/**
 * Inline category dropdown. Uses semantic category tokens from index.css.
 * Stops click propagation so it works inside clickable rows.
 */
export function CategoryEditor({ value, onChange, disabled, className }: Props) {
  const resolved = resolveCategory(value);
  const meta = getCategoryMeta(resolved);
  return (
    <div onClick={(e) => e.stopPropagation()} className={className}>
      <Select value={resolved} onValueChange={onChange} disabled={disabled}>
        <SelectTrigger
          className="h-8 rounded-full border-0 px-3 text-xs font-medium gap-1.5 w-auto min-w-[150px] hover:opacity-90 transition-opacity"
          style={{ backgroundColor: `hsl(var(--${meta.token}))` }}
        >
          <SelectValue>
            <span className="inline-flex items-center gap-1.5">
              <span>{meta.emoji}</span>
              <span className="text-foreground/80">{resolved}</span>
            </span>
          </SelectValue>
        </SelectTrigger>
        <SelectContent className="rounded-2xl border-0 shadow-card bg-popover max-h-80">
          {CATEGORIES.map((c) => (
            <SelectItem key={c.key} value={c.key} className="rounded-xl text-sm">
              <span className="inline-flex items-center gap-2">
                <span>{c.emoji}</span>
                <span>{c.key}</span>
              </span>
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}
