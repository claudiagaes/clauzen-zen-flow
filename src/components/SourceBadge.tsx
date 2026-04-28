import { getExpenseSource, type Expense } from "@/lib/data";

type ExpenseLike = Pick<Expense, "splitwise_expense_id" | "notes" | "description">;

interface Props {
  expense: ExpenseLike;
  className?: string;
}

export function SourceBadge({ expense, className = "" }: Props) {
  const source = getExpenseSource(expense);

  const styles: Record<string, string> = {
    splitwise: "bg-purple-100 text-purple-700 dark:bg-purple-500/20 dark:text-purple-200",
    rockie: "bg-teal-100 text-teal-700 dark:bg-teal-500/20 dark:text-teal-200",
    manual: "bg-muted text-muted-foreground",
  };

  const label =
    source === "splitwise" ? "Splitwise" : source === "rockie" ? "🐾 Rockie" : "Manual";

  return (
    <span
      className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-medium tracking-wide ${styles[source]} ${className}`}
    >
      {label}
    </span>
  );
}
