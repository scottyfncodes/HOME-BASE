import Link from "next/link";
import { currentVaccinations, getTimeline, listMedications, weightHistory } from "@/core/services/pet-health";
import { describeDue, formatDate, todayIn } from "@/core/domain/dates";
import { COMMON_VACCINES, formatWeight, fromGrams, possessive, vaccineStatus } from "@/core/domain/pets";
import { ButtonLink } from "@/components/ui/button";
import { Card, Pill, Section } from "@/components/ui/page";
import { loadPet } from "../../../load";
import { TimelineList } from "../../../timeline";

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }) {
  const { pet } = await loadPet((await params).id);
  return { title: `${pet.name} · Health` };
}

export default async function PetHealthPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { ctx, pet } = await loadPet(id);
  const today = todayIn(ctx.timezone);
  const [vaccines, meds, timeline, weights] = await Promise.all([currentVaccinations(ctx, id), listMedications(ctx, id), getTimeline(ctx, id), weightHistory(ctx, id)]);
  const archived = Boolean(pet.archivedAt);
  const active = meds.filter((m) => m.active);
  const past = meds.filter((m) => !m.active);
  const flags = timeline.filter((t) => t.type === "event" && (t.event.kind === "allergy" || t.event.kind === "condition"));
  const suggestions = (COMMON_VACCINES[pet.species] ?? []).filter((s) => !vaccines.some((v) => v.name.toLowerCase() === s.toLowerCase()));
  const latestWeight = weights.at(-1);
  const previousWeight = weights.length > 1 ? weights.at(-2) : undefined;

  return (
    <div className="flex flex-col gap-7">
      {!archived && (
        <div className="flex flex-wrap gap-2">
          <ButtonLink href={`/pets/${id}/health/new?kind=vet_visit`} size="sm">Log a vet visit</ButtonLink>
          <ButtonLink href={`/pets/${id}/vaccinations/new`} size="sm" variant="secondary">Record a vaccination</ButtonLink>
          <ButtonLink href={`/pets/${id}/medications/new`} size="sm" variant="secondary">Add medication</ButtonLink>
          <ButtonLink href={`/pets/${id}/health/new?kind=weight`} size="sm" variant="secondary">Record weight</ButtonLink>
          <ButtonLink href={`/pets/${id}/health/new?kind=condition`} size="sm" variant="secondary">Other record</ButtonLink>
        </div>
      )}

      <p className="text-sm text-ink-2 max-w-prose">A record of what the vet did and said, kept in one place. Home Base does not give medical advice; call your veterinarian with any concern about {possessive(pet.name)} health.</p>

      {flags.length > 0 && (
        <Section title="Allergies and conditions">
          <div className="flex flex-wrap gap-2">
            {flags.map((f) =>
              f.type === "event" ? (
                <Link key={f.id} href={`/pets/${id}/health/${f.id}`} className="inline-flex items-center gap-2 h-9 px-3.5 rounded-full border border-line bg-surface text-sm hover:bg-surface-2">
                  <span className="text-ink-3 font-semibold text-xs uppercase tracking-wide">{f.event.kind === "allergy" ? "Allergy" : "Condition"}</span>
                  <span className="font-medium">{f.event.title}</span>
                </Link>
              ) : null,
            )}
          </div>
        </Section>
      )}

      <Section title="Vaccinations" description={vaccines.length > 0 ? "The latest dose of each vaccine." : undefined} action={!archived && vaccines.length > 0 ? <Link href={`/pets/${id}/vaccinations/new`} className="text-sm font-semibold text-brand">Add</Link> : undefined}>
        {vaccines.length === 0 ? (
          <Card className="p-4 sm:p-5 flex flex-col gap-3">
            <p className="text-[15px] text-ink-2">No vaccinations recorded. Add them from the vet&apos;s certificate and you will be reminded before each one is due.</p>
            {!archived && suggestions.length > 0 && (
              <div className="flex flex-wrap gap-2">
                {suggestions.map((s) => (
                  <Link key={s} href={`/pets/${id}/vaccinations/new?name=${encodeURIComponent(s)}`} className="inline-flex items-center h-9 px-3.5 rounded-full border border-line-strong bg-surface text-sm font-medium hover:bg-surface-2">
                    {s}
                  </Link>
                ))}
              </div>
            )}
          </Card>
        ) : (
          <Card className="divide-y divide-line overflow-hidden">
            {vaccines.map((v) => {
              const s = vaccineStatus(v.nextDueOn, today);
              return (
                <Link key={v.id} href={`/pets/${id}/vaccinations/${v.id}`} className="flex items-center gap-3 px-4 py-3 min-h-16 hover:bg-surface-2/60">
                  <div className="min-w-0 flex-1">
                    <div className="font-medium text-[15px] leading-snug">{v.name}</div>
                    <div className="text-sm text-ink-2 mt-0.5">
                      Given {formatDate(v.administeredOn)}
                      {v.nextDueOn ? ` · due ${formatDate(v.nextDueOn)}` : ""}
                    </div>
                  </div>
                  {s === "overdue" && <Pill tone="danger">Overdue</Pill>}
                  {s === "due_soon" && <Pill tone="warn">{describeDue(v.nextDueOn!, today)}</Pill>}
                  {s === "current" && <Pill tone="ok">Up to date</Pill>}
                  {s === "no_due_date" && <Pill>No due date</Pill>}
                </Link>
              );
            })}
          </Card>
        )}
      </Section>

      <section id="medications" className="scroll-mt-20">
        <Section title="Medications" action={!archived && meds.length > 0 ? <Link href={`/pets/${id}/medications/new`} className="text-sm font-semibold text-brand">Add</Link> : undefined}>
          {meds.length === 0 ? (
            <Card className="p-4 sm:p-5 text-[15px] text-ink-2">No medications recorded.</Card>
          ) : (
            <Card className="divide-y divide-line overflow-hidden">
              {[...active, ...past].map((m) => (
                <Link key={m.id} href={`/pets/${id}/medications/${m.id}`} className="flex items-center gap-3 px-4 py-3 min-h-16 hover:bg-surface-2/60">
                  <div className="min-w-0 flex-1">
                    <div className={m.active ? "font-medium text-[15px]" : "font-medium text-[15px] text-ink-2"}>{m.name}</div>
                    <div className="text-sm text-ink-2 mt-0.5 truncate">{[m.dosage, m.frequency, m.provider?.name].filter(Boolean).join(" · ") || "No dosage recorded"}</div>
                  </div>
                  {m.active ? <Pill tone="brand">Active</Pill> : <Pill>{m.endedOn ? `Ended ${formatDate(m.endedOn, { year: false })}` : "Stopped"}</Pill>}
                </Link>
              ))}
            </Card>
          )}
        </Section>
      </section>

      {latestWeight && (
        <Section title="Weight" action={!archived ? <Link href={`/pets/${id}/health/new?kind=weight`} className="text-sm font-semibold text-brand">Record</Link> : undefined}>
          <Card className="p-4 sm:p-5 flex flex-wrap items-end justify-between gap-3">
            <div>
              <div className="figure text-[32px]">{formatWeight(latestWeight.weightGrams, pet.weightUnit)}</div>
              <div className="text-sm text-ink-2 mt-2">Weighed {formatDate(latestWeight.occurredOn)}</div>
            </div>
            {previousWeight && <WeightChange from={previousWeight} to={latestWeight} unit={pet.weightUnit} />}
          </Card>
        </Section>
      )}

      <Section title="History" description={timeline.length > 0 ? `${timeline.length} record${timeline.length === 1 ? "" : "s"}, newest first.` : undefined}>
        {timeline.length === 0 ? (
          <Card className="p-4 sm:p-5 text-[15px] text-ink-2">Nothing recorded yet. Start with the most recent vet visit.</Card>
        ) : (
          <TimelineList petId={id} entries={timeline} today={today} weightUnit={pet.weightUnit} />
        )}
      </Section>
    </div>
  );
}

function WeightChange({ from, to, unit }: { from: { weightGrams: number | null; occurredOn: string }; to: { weightGrams: number | null }; unit: "lb" | "kg" | "g" }) {
  if (from.weightGrams == null || to.weightGrams == null) return null;
  const delta = fromGrams(to.weightGrams, unit) - fromGrams(from.weightGrams, unit);
  const rounded = unit === "g" ? Math.round(delta) : Math.round(delta * 10) / 10;
  return (
    <div className="text-sm text-ink-2 text-right">
      {rounded === 0 ? "No change" : `${rounded > 0 ? "Up" : "Down"} ${Math.abs(rounded)} ${unit}`}
      <br />
      since {formatDate(from.occurredOn)}
    </div>
  );
}
