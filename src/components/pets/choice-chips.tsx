"use client";
import { cn } from "@/lib/cn";

/**
 * A row of large, tappable single-choice chips backed by radio inputs.
 * Easier on a phone than a dropdown when there are only a handful of options.
 */
export function ChoiceChips<T extends string>({
  name,
  options,
  value,
  defaultValue,
  onChange,
  label,
  className,
}: {
  name: string;
  options: ReadonlyArray<{ value: T; label: string }>;
  value?: T;
  defaultValue?: T;
  onChange?: (v: T) => void;
  label: string;
  className?: string;
}) {
  return (
    <div role="radiogroup" aria-label={label} className={cn("flex flex-wrap gap-2", className)}>
      {options.map((o) => (
        <label key={o.value} className="relative">
          <input
            type="radio"
            name={name}
            value={o.value}
            className="peer sr-only"
            // With onChange the parent owns the value (possibly none yet); otherwise the input does.
            checked={onChange ? value === o.value : undefined}
            defaultChecked={onChange ? undefined : defaultValue === o.value}
            onChange={() => onChange?.(o.value)}
          />
          <span className="inline-flex items-center h-10 px-4 rounded-full border border-line-strong bg-surface text-[15px] font-medium text-ink-2 cursor-pointer transition-colors hover:bg-surface-2 peer-checked:bg-ink peer-checked:text-bg peer-checked:border-ink peer-focus-visible:outline-2 peer-focus-visible:outline-offset-2 peer-focus-visible:outline-[var(--ring)]">
            {o.label}
          </span>
        </label>
      ))}
    </div>
  );
}
