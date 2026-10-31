import Link from "next/link";
import type { TimelineEntry } from "@/core/services/pet-health";
import { formatDate } from "@/core/domain/dates";
import { formatWeight } from "@/core/domain/pets";
import { formatCents } from "@/core/domain/money";
import { PET_HEALTH_KIND_LABELS, type PetHealthKind, type WeightUnit } from "@/core/domain/validation";
import { cn } from "@/lib/cn";

/**
 * A pet's health history as a dated vertical timeline. Upcoming entries
 * (appointments) are marked so they are not mistaken for history.
 */
export function TimelineList({ petId, entries, today, weightUnit }: { petId: string; entries: TimelineEntry[]; today: string; weightUnit: WeightUnit }) {
  return (
    <ol className="card overflow-hidden">
      {entries.map((e, i) => {
        const { href, kind, title, detail } = describe(petId, e, weightUnit);
        const upcoming = e.on > today;
        return (
          <li key={`${e.type}-${e.id}`} className={cn(i > 0 && "border-t border-line")}>
            <Link href={href} className="grid grid-cols-[4.25rem_1fr] sm:grid-cols-[6.5rem_1fr] gap-3 px-4 py-3.5 hover:bg-surface-2/60 transition-colors">
              <div className="pt-0.5">
                <div className="text-[13px] font-semibold tabular-nums text-ink-2 leading-tight">{formatDate(e.on, { year: false })}</div>
                <div className="text-xs text-ink-3 tabular-nums mt-0.5">{e.on.slice(0, 4)}</div>
              </div>
              <div className="min-w-0 border-l-2 pl-3 -my-0.5 py-0.5" style={{ borderColor: e.type === "vaccination" ? "var(--brand)" : upcoming ? "var(--warn)" : "var(--line-strong)" }}>
                <div className={cn("eyebrow", upcoming && "text-warn")}>{upcoming ? `Upcoming · ${kind}` : kind}</div>
                <div className="font-medium text-[15px] leading-snug mt-1">{title}</div>
                {detail && <div className="text-sm text-ink-2 mt-0.5">{detail}</div>}
              </div>
            </Link>
          </li>
        );
      })}
    </ol>
  );
}

function describe(petId: string, e: TimelineEntry, unit: WeightUnit) {
  if (e.type === "vaccination") {
    const v = e.vaccination;
    return {
      href: `/pets/${petId}/vaccinations/${v.id}`,
      kind: "Vaccination",
      title: v.name,
      detail: [v.provider?.name, v.nextDueOn ? `Next due ${formatDate(v.nextDueOn)}` : null, v.document ? "Certificate on file" : null].filter(Boolean).join(" · ") || null,
    };
  }
  if (e.type === "medication") {
    const m = e.medication;
    return {
      href: `/pets/${petId}/medications/${m.id}`,
      kind: m.active ? "Medication started" : "Medication",
      title: m.name,
      detail: [m.dosage, m.frequency, !m.active && m.endedOn ? `Stopped ${formatDate(m.endedOn)}` : null].filter(Boolean).join(" · ") || null,
    };
  }
  const ev = e.event;
  return {
    href: `/pets/${petId}/health/${ev.id}`,
    kind: PET_HEALTH_KIND_LABELS[ev.kind as PetHealthKind] ?? "Health",
    title: ev.kind === "weight" && ev.weightGrams != null ? formatWeight(ev.weightGrams, unit) : ev.title,
    detail:
      [
        ev.provider?.name,
        ev.expense ? formatCents(ev.expense.amountCents) : null,
        ev.followUpOn ? `Follow up ${formatDate(ev.followUpOn)}` : null,
        ev.documents.length > 0 ? `${ev.documents.length} document${ev.documents.length === 1 ? "" : "s"}` : null,
        ev.kind !== "weight" && ev.description ? truncate(ev.description, 90) : null,
      ]
        .filter(Boolean)
        .join(" · ") || null,
  };
}

function truncate(s: string, n: number) {
  return s.length > n ? `${s.slice(0, n - 1).trimEnd()}…` : s;
}
