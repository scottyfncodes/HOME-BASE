/** Money is stored as integer cents. */

export function parseMoneyToCents(input: string | null | undefined): number | null {
  if (input == null) return null;
  const cleaned = String(input).replace(/[$,\s]/g, "");
  if (cleaned === "") return null;
  if (!/^-?\d+(\.\d{1,2})?$/.test(cleaned)) return Number.NaN;
  const [whole, frac = ""] = cleaned.split(".");
  const sign = whole.startsWith("-") ? -1 : 1;
  const cents = Math.abs(Number(whole)) * 100 + Number((frac + "00").slice(0, 2));
  return sign * cents;
}

export function formatCents(cents: number | null | undefined, opts: { compact?: boolean } = {}): string {
  if (cents == null || Number.isNaN(cents)) return "";
  const amount = cents / 100;
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: opts.compact && Number.isInteger(amount) ? 0 : 2,
    minimumFractionDigits: opts.compact && Number.isInteger(amount) ? 0 : 2,
  }).format(amount);
}

export function centsToInput(cents: number | null | undefined): string {
  if (cents == null) return "";
  return (cents / 100).toFixed(2);
}

export function sumCents(values: Array<number | null | undefined>): number {
  return values.reduce<number>((acc, v) => acc + (v ?? 0), 0);
}
