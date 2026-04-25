import { getCategoryMeta } from "@/lib/data";

export function CategoryChip({ category, size = "md" }: { category: string; size?: "sm" | "md" }) {
  const meta = getCategoryMeta(category);
  const padding = size === "sm" ? "px-2.5 py-0.5 text-[11px]" : "px-3 py-1 text-xs";
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full font-medium text-foreground/80 ${padding}`}
      style={{ backgroundColor: `hsl(var(--${meta.token}))` }}
    >
      <span>{meta.emoji}</span>
      <span>{meta.key}</span>
    </span>
  );
}
