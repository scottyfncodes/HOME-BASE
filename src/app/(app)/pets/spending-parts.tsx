import { formatCents } from "@/core/domain/money";
import { PET_EXPENSE_CATEGORY_LABELS, type PetExpenseCategory } from "@/core/domain/validation";

/** Spending by category as labeled bars: one color, length carries the meaning. */
export function CategoryBars({ rows }: { rows: Array<{ category: PetExpenseCategory; cents: number }> }) {
  const max = Math.max(...rows.map((r) => r.cents), 1);
  const total = rows.reduce((a, r) => a + r.cents, 0);
  return (
    <div className="card p-4 sm:p-5">
      <ul className="flex flex-col gap-3.5">
        {rows.map((r) => (
          <li key={r.category}>
            <div className="flex items-baseline justify-between gap-3 text-[15px]">
              <span>{PET_EXPENSE_CATEGORY_LABELS[r.category]}</span>
              <span className="tabular-nums font-semibold">
                {formatCents(r.cents, { compact: true })}
                <span className="text-ink-3 font-normal text-sm ml-2">{Math.round((r.cents / total) * 100)}%</span>
              </span>
            </div>
            <div className="h-2 rounded-full bg-surface-2 mt-1.5 overflow-hidden" aria-hidden>
              <div className="h-full rounded-full bg-brand" style={{ width: `${Math.max(2, (r.cents / max) * 100)}%` }} />
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}
