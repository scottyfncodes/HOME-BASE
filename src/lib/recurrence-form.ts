import { parseRecurrenceValue } from "@/core/domain/recurrence";
import type { Recurrence } from "@/core/db/schema";

/**
 * Reads the recurrence controls from a form: a preset value like "3-month",
 * or "custom" with explicit `every`/`unit`, plus the anchor rule.
 */
export function recurrenceFromForm(formData: FormData): Recurrence | null {
  const preset = String(formData.get("recurrence") ?? "");
  const anchor = formData.get("anchor") === "completed" ? "completed" : "due";
  if (preset === "custom") {
    const every = Number(formData.get("every") ?? 0);
    const unit = String(formData.get("unit") ?? "");
    return parseRecurrenceValue(`${every}-${unit}`, anchor);
  }
  return parseRecurrenceValue(preset, anchor);
}
