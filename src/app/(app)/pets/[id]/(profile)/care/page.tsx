import Link from "next/link";
import { Plus } from "lucide-react";
import { careHistory, lastDoneByRoutine, listCareRoutines } from "@/core/services/pet-care";
import { describeDue, formatDate, todayIn } from "@/core/domain/dates";
import { describeRecurrence } from "@/core/domain/recurrence";
import { CARE_SUGGESTIONS, possessive } from "@/core/domain/pets";
import { PET_CARE_KIND_LABELS, type PetCareKind } from "@/core/domain/validation";
import { ButtonLink } from "@/components/ui/button";
import { Card, Section } from "@/components/ui/page";
import { CareDoneButton } from "../../../care-done-button";
import { loadPet } from "../../../load";

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }) {
  const { pet } = await loadPet((await params).id);
  return { title: `${pet.name} · Care` };
}

export default async function PetCarePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { ctx, pet } = await loadPet(id);
  const today = todayIn(ctx.timezone);
  const [routines, lastDone, history] = await Promise.all([listCareRoutines(ctx, id), lastDoneByRoutine(ctx, id), careHistory(ctx, id, { limit: 30 })]);
  const archived = Boolean(pet.archivedAt);
  const due = routines.filter((r) => r.dueOn <= today);
  const later = routines.filter((r) => r.dueOn > today);
  const existing = new Set(routines.map((r) => r.title.toLowerCase()));
  const suggestions = (CARE_SUGGESTIONS[pet.species] ?? CARE_SUGGESTIONS.other).filter((s) => !existing.has(s.title.toLowerCase()));

  if (archived) {
    return (
      <div className="flex flex-col gap-7">
        <Card className="p-4 sm:p-5 text-[15px] text-ink-2">{pet.name} is archived, so routines are paused. Restore them from the Overview to bring reminders back.</Card>
        <History history={history} />
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-7">
      <Section title="Due now" description={due.length === 0 && routines.length > 0 ? "All caught up." : undefined} action={<Link href={`/pets/${id}/care/new`} className="text-sm font-semibold text-brand">Add a routine</Link>}>
        {routines.length === 0 ? (
          <Card className="p-4 sm:p-5 flex flex-col gap-3">
            <p className="text-[15px] text-ink-2">Routines are the everyday care {possessive(pet.name)} needs. Add the ones worth a reminder and tap Mark done as you go. They also reach your phone through the calendar feed in Settings.</p>
            <div>
              <ButtonLink href={`/pets/${id}/care/new`} size="sm">Add a routine</ButtonLink>
            </div>
          </Card>
        ) : due.length > 0 ? (
          <Card className="divide-y divide-line overflow-hidden">
            {due.map((r) => (
              <RoutineRow key={r.id} petId={id} r={r} last={lastDone.get(r.id)} today={today} showDone />
            ))}
          </Card>
        ) : null}
      </Section>

      {later.length > 0 && (
        <Section title="Coming up">
          <Card className="divide-y divide-line overflow-hidden">
            {later.map((r) => (
              <RoutineRow key={r.id} petId={id} r={r} last={lastDone.get(r.id)} today={today} />
            ))}
          </Card>
        </Section>
      )}

      {suggestions.length > 0 && (
        <section className="flex flex-col gap-3">
          <h2 className="eyebrow">Common routines</h2>
          <div className="flex flex-wrap gap-2">
            {suggestions.map((s) => (
              <Link key={s.title} href={`/pets/${id}/care/new?title=${encodeURIComponent(s.title)}&kind=${s.kind}&recurrence=${s.recurrence}`} className="inline-flex items-center gap-1.5 h-9 rounded-full border border-line bg-surface px-3.5 text-sm font-medium hover:bg-surface-2">
                <Plus className="size-3.5 text-brand" aria-hidden /> {s.title}
              </Link>
            ))}
          </div>
        </section>
      )}

      <History history={history} />
    </div>
  );
}

function RoutineRow({ petId, r, last, today, showDone }: { petId: string; r: { id: string; title: string; dueOn: string; careKind: string | null; recurrence: Parameters<typeof describeRecurrence>[0]; medication: { name: string } | null }; last?: string; today: string; showDone?: boolean }) {
  const kind = PET_CARE_KIND_LABELS[(r.careKind ?? "other") as PetCareKind] ?? "Care";
  const sub = [describeRecurrence(r.recurrence), last ? `last done ${describeDue(last, today).toLowerCase()}` : null].filter(Boolean).join(" · ");
  return (
    <div className="flex items-center gap-3 px-4 py-3 min-h-16">
      <Link href={`/pets/${petId}/care/${r.id}`} className="min-w-0 flex-1 group">
        <div className="eyebrow">{kind}</div>
        <div className="font-medium text-[15px] leading-snug mt-1 group-hover:text-brand">{r.title}</div>
        <div className="text-sm text-ink-2 mt-0.5 truncate">{showDone ? sub : `${describeDue(r.dueOn, today)} · ${sub}`}</div>
      </Link>
      {showDone && <CareDoneButton petId={petId} routineId={r.id} compact />}
    </div>
  );
}

function History({ history }: { history: Array<{ id: string; title: string; completedOn: string; completedByUser: { name: string } | null; notes: string | null }> }) {
  if (history.length === 0) return null;
  return (
    <Section title="Recently done">
      <Card className="divide-y divide-line overflow-hidden">
        {history.map((h) => (
          <div key={h.id} className="flex items-center gap-3 px-4 py-2.5 min-h-12">
            <div className="min-w-0 flex-1">
              <div className="text-[15px] leading-snug truncate">{h.title}</div>
              {(h.completedByUser || h.notes) && <div className="text-sm text-ink-2 truncate">{[h.completedByUser?.name.split(" ")[0], h.notes].filter(Boolean).join(" · ")}</div>}
            </div>
            <div className="text-sm text-ink-2 tabular-nums shrink-0">{formatDate(h.completedOn, { year: false })}</div>
          </div>
        ))}
      </Card>
    </Section>
  );
}
