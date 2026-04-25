import { ChevronLeft, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { monthLabel } from "@/lib/format";

interface Props {
  value: Date;
  onChange: (d: Date) => void;
}

export function MonthPicker({ value, onChange }: Props) {
  const prev = () => onChange(new Date(value.getFullYear(), value.getMonth() - 1, 1));
  const next = () => onChange(new Date(value.getFullYear(), value.getMonth() + 1, 1));
  const isCurrent =
    value.getMonth() === new Date().getMonth() && value.getFullYear() === new Date().getFullYear();

  return (
    <div className="inline-flex items-center gap-1 bg-card rounded-2xl p-1 shadow-soft">
      <Button variant="ghost" size="icon" onClick={prev} className="h-8 w-8 rounded-xl text-muted-foreground hover:text-foreground hover:bg-secondary">
        <ChevronLeft className="h-4 w-4" />
      </Button>
      <div className="px-3 py-1 text-sm font-medium min-w-[150px] text-center">
        {monthLabel(value)}
      </div>
      <Button
        variant="ghost"
        size="icon"
        onClick={next}
        disabled={isCurrent}
        className="h-8 w-8 rounded-xl text-muted-foreground hover:text-foreground hover:bg-secondary disabled:opacity-30"
      >
        <ChevronRight className="h-4 w-4" />
      </Button>
    </div>
  );
}
