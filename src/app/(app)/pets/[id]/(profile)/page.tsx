import Link from "next/link";
import { Phone } from "lucide-react";
import { listPetProviders } from "@/core/services/pets";
import { currentVaccinations, getTimeline, listMedications } from "@/core/services/pet-health";
import { lastDoneByRoutine, listCareRoutines } from "@/core/services/pet-care";
import { describeDue, formatDate, todayIn } from "@/core/domain/dates";
import { describeAge, formatWeight, possessive, vaccineStatus } from "@/core/domain/pets";
import { PET_PROVIDER_ROLE_LABELS, PET_SEX_LABELS } from "@/core/domain/validation";
import { ButtonLink } from "@/components/ui/button";
import { Card, DescriptionList, Section } from "@/components/ui/page";
import { ConfirmForm } from "@/components/ui/confirm-form";
import { cn } from "@/lib/cn";
import { archivePetAction, deletePetAction, restorePetAction, unlinkProviderAction } from "../../actions";
import { CareDoneButton } from "../../care-done-button";
import { loadPet } from "../../load";
import { TimelineList } from "../../timeline";

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }) {
  const { pet } = await loadPet((await params).id);
  return { title: pet.name };
}

type NextUp = { tone: "danger" | "warn" | "brand" | "neutral"; eyebrow: string; title: string; body?: string; action?: React.ReactNode };

export default async function PetOverviewPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { ctx, pet } = await loadPet(id);
  const today = todayIn(ctx.timezone);
  const [team, vaccines, routines, lastDone, meds, timeline] = await Promise.all([
    listPetProviders(ctx, id),
    currentVaccinations(ctx, id),
    listCareRoutines(ctx, id),
    lastDoneByRoutine(ctx, id),
    listMedications(ctx, id),
    getTimeline(ctx, id, { limit: 4 }),
  ]);
  const archived = Boolean(pet.archivedAt);
  const name = pet.name;

  // The single most useful thing to do next, most urgent first.
  const candidates: NextUp[] = [];
  for (const v of vaccines) {
    const s = vaccineStatus(v.nextDueOn, today);
    if (s === "overdue") candidates.push({ tone: "danger", eyebrow: "Vaccination overdue", title: `${v.name} was due ${formatDate(v.nextDueOn)}`, body: `Last given ${formatDate(v.administeredOn)}. Record the new dose once it is done.`, action: <ButtonLink href={`/pets/${id}/vaccinations/new?name=${encodeURIComponent(v.name)}`} size="sm">Record vaccination</ButtonLink> });
  }
  const dueNow = routines.filter((r) => r.dueOn <= today);
  for (const r of dueNow.slice(0, 1)) {
    candidates.push({ tone: "brand", eyebrow: r.dueOn < today ? "Care" : "Today", title: r.title, body: r.description ?? (lastDone.get(r.id) ? `Last done ${describeDue(lastDone.get(r.id)!, today).toLowerCase()}.` : undefined), action: <CareDoneButton petId={id} routineId={r.id} /> });
  }
  for (const v of vaccines) {
    if (vaccineStatus(v.nextDueOn, today) === "due_soon") candidates.push({ tone: "warn", eyebrow: "Vaccination due soon", title: `${v.name} is due ${describeDue(v.nextDueOn!, today).toLowerCase()}`, body: `Due ${formatDate(v.nextDueOn)}.`, action: <ButtonLink href={`/pets/${id}/vaccinations/new?name=${encodeURIComponent(v.name)}`} size="sm" variant="secondary">Record vaccination</ButtonLink> });
  }
  const upcomingVisit = timeline.find((t) => t.type === "event" && t.event.kind === "vet_visit" && t.on >= today);
  if (upcomingVisit && upcomingVisit.type === "event") candidates.push({ tone: "neutral", eyebrow: "Vet appointment", title: upcomingVisit.event.title, body: `${describeDue(upcomingVisit.on, today)}${upcomingVisit.event.provider ? ` at ${upcomingVisit.event.provider.name}` : ""}.` });
  if (!archived && !team.some((t) => t.role === "primary_vet" || t.role === "vet")) candidates.push({ tone: "neutral", eyebrow: "Getting started", title: `Who is ${possessive(name)} vet?`, body: "Their number will be one tap away here and on the Preparedness page.", action: <ButtonLink href={`/pets/${id}/team/new`} size="sm" variant="secondary">Add a veterinarian</ButtonLink> });
  if (!archived && routines.length === 0) candidates.push({ tone: "neutral", eyebrow: "Getting started", title: "Set up a routine", body: "Feeding, walks, flea treatment, nail trims. Mark them done as you go.", action: <ButtonLink href={`/pets/${id}/care/new`} size="sm" variant="secondary">Add a routine</ButtonLink> });
  const next = archived ? undefined : candidates[0];

  const activeMeds = meds.filter((m) => m.active);
  const age = describeAge(pet.birthDate, today, pet.birthDateEstimated);

  return (
    <div className="flex flex-col gap-7">
      {next && (
        <section
          aria-label="Next up"
          className={cn(
            "rounded-[var(--radius)] p-4 sm:p-5 flex flex-col gap-3 border",
            next.tone === "danger" ? "bg-danger-soft border-danger/20" : next.tone === "warn" ? "bg-warn-soft border-warn/20" : next.tone === "brand" ? "bg-brand-soft border-brand/15" : "bg-surface border-line",
          )}
        >
          <div className={cn("eyebrow", next.tone === "danger" ? "text-danger" : next.tone === "warn" ? "text-warn" : next.tone === "brand" ? "text-brand" : undefined)}>{next.eyebrow}</div>
          <div>
            <div className="font-display text-[22px] leading-tight font-semibold">{next.title}</div>
            {next.body && <p className="text-[15px] text-ink-2 mt-1.5">{next.body}</p>}
          </div>
          {next.action && <div>{next.action}</div>}
        </section>
      )}

      {!archived && (
        <nav aria-label="Quick actions" className="grid grid-cols-2 sm:grid-cols-4 gap-2">
          <QuickAction href={`/pets/${id}/health/new?kind=vet_visit`} label="Log a vet visit" />
          <QuickAction href={`/pets/${id}/vaccinations/new`} label="Record a vaccination" />
          <QuickAction href={`/pets/${id}/health/new?kind=weight`} label="Record weight" />
          <QuickAction href={`/pets/${id}/medications/new`} label="Add medication" />
          <QuickAction href={`/pets/${id}/care/new`} label="Add a routine" />
          <QuickAction href={`/pets/${id}/expenses/new`} label="Add an expense" />
          <QuickAction href={`/documents/new?petId=${id}`} label="Upload a document" />
          <QuickAction href={`/pets/${id}/edit`} label="Edit profile" />
        </nav>
      )}

      <Section title="At a glance">
        <Card className="p-4 sm:p-5">
          <DescriptionList
            items={[
              pet.birthDate && { label: pet.birthDateEstimated ? "Born (estimated)" : "Born", value: `${formatDate(pet.birthDate)}${age ? ` · ${age}` : ""}` },
              pet.acquiredOn && { label: "Joined the family", value: `${formatDate(pet.acquiredOn)}${pet.acquiredFrom ? ` · ${pet.acquiredFrom}` : ""}` },
              !pet.acquiredOn && pet.acquiredFrom && { label: "Came from", value: pet.acquiredFrom },
              pet.weightGrams != null && { label: "Weight", value: formatWeight(pet.weightGrams, pet.weightUnit) },
              pet.sex && { label: "Sex", value: PET_SEX_LABELS[pet.sex] },
              pet.neutered && { label: pet.sex === "female" ? "Spayed" : pet.sex === "male" ? "Neutered" : "Spayed or neutered", value: pet.neutered === "yes" ? "Yes" : pet.neutered === "no" ? "No" : "Not sure" },
              pet.color && { label: "Color", value: pet.color },
              pet.microchipNumber && { label: "Microchip", value: <span><span className="font-mono text-sm">{pet.microchipNumber}</span>{pet.microchipProvider ? <span className="text-ink-2"> · {pet.microchipProvider}</span> : null}</span> },
              pet.markings && { label: "Distinguishing features", value: pet.markings },
            ]}
          />
          {!pet.birthDate && !pet.weightGrams && !pet.microchipNumber && !pet.color && !pet.markings && (
            <p className="text-sm text-ink-2">
              Nothing else recorded yet, and that is fine.{" "}
              <Link href={`/pets/${id}/edit`} className="font-semibold text-brand">
                Add details
              </Link>{" "}
              like a microchip number or distinguishing features when you have them.
            </p>
          )}
        </Card>
      </Section>

      {activeMeds.length > 0 && (
        <Section title="Current medications" action={<Link href={`/pets/${id}/health#medications`} className="text-sm font-semibold text-brand">All</Link>}>
          <Card className="divide-y divide-line overflow-hidden">
            {activeMeds.map((m) => (
              <Link key={m.id} href={`/pets/${id}/medications/${m.id}`} className="block px-4 py-3 hover:bg-surface-2/60">
                <div className="font-medium text-[15px]">{m.name}</div>
                <div className="text-sm text-ink-2 mt-0.5">{[m.dosage, m.frequency].filter(Boolean).join(" · ") || "Dosage not recorded"}</div>
              </Link>
            ))}
          </Card>
        </Section>
      )}

      <Section title="Care team" action={!archived ? <Link href={`/pets/${id}/team/new`} className="text-sm font-semibold text-brand">Add</Link> : undefined}>
        {team.length === 0 ? (
          <Card className="p-4 sm:p-5 text-[15px] text-ink-2">
            No veterinarian or other providers yet.{" "}
            {!archived && (
              <Link href={`/pets/${id}/team/new`} className="font-semibold text-brand">
                Add one
              </Link>
            )}
          </Card>
        ) : (
          <Card className="divide-y divide-line overflow-hidden">
            {team.map((t) => (
              <div key={t.provider.id} className="flex items-center gap-3 px-4 py-3 min-h-16">
                <div className="min-w-0 flex-1">
                  <div className="eyebrow">{PET_PROVIDER_ROLE_LABELS[t.role]}</div>
                  <Link href={`/providers/${t.provider.id}`} className="block font-medium text-[15px] leading-snug mt-1 hover:text-brand">
                    {t.provider.name}
                  </Link>
                  {(t.provider.address || t.provider.afterHoursPhone) && (
                    <div className="text-sm text-ink-2 mt-0.5 truncate">{[t.provider.afterHoursPhone ? `After hours ${t.provider.afterHoursPhone}` : null, t.provider.address].filter(Boolean).join(" · ")}</div>
                  )}
                </div>
                {t.provider.phone && (
                  <a href={`tel:${t.provider.phone.replace(/[^\d+]/g, "")}`} className="size-10 shrink-0 rounded-xl bg-brand-soft text-brand flex items-center justify-center" aria-label={`Call ${t.provider.name}`}>
                    <Phone className="size-4" aria-hidden />
                  </a>
                )}
                {!archived && (
                  <ConfirmForm action={unlinkProviderAction} hidden={{ petId: id, providerId: t.provider.id }} confirm={`Remove ${t.provider.name} from ${possessive(name)} care team? The provider stays in your list.`} variant="ghost" size="sm">
                    Remove
                  </ConfirmForm>
                )}
              </div>
            ))}
          </Card>
        )}
      </Section>

      {(pet.emergencyContactName || pet.emergencyContactPhone || pet.insuranceProvider || pet.insurancePolicyNumber) && (
        <Section title="Emergency and insurance">
          <Card className="p-4 sm:p-5">
            <DescriptionList
              items={[
                (pet.emergencyContactName || pet.emergencyContactPhone) && {
                  label: "Emergency contact",
                  value: (
                    <span>
                      {pet.emergencyContactName}
                      {pet.emergencyContactPhone && (
                        <>
                          {pet.emergencyContactName ? " · " : ""}
                          <a href={`tel:${pet.emergencyContactPhone.replace(/[^\d+]/g, "")}`} className="font-semibold text-brand">
                            {pet.emergencyContactPhone}
                          </a>
                        </>
                      )}
                    </span>
                  ),
                },
                pet.insuranceProvider && { label: "Insurance", value: pet.insuranceProvider },
                pet.insurancePolicyNumber && { label: "Policy number", value: <span className="font-mono text-sm">{pet.insurancePolicyNumber}</span> },
                pet.insurancePhone && { label: "Claims", value: <a href={`tel:${pet.insurancePhone.replace(/[^\d+]/g, "")}`} className="font-semibold text-brand">{pet.insurancePhone}</a> },
              ]}
            />
          </Card>
        </Section>
      )}

      <Section title="Recent health" action={<Link href={`/pets/${id}/health`} className="text-sm font-semibold text-brand">Full history</Link>}>
        {timeline.length === 0 ? (
          <Card className="p-4 sm:p-5 text-[15px] text-ink-2">
            Vet visits, vaccinations and weights will build {possessive(name)} history here.
          </Card>
        ) : (
          <TimelineList petId={id} entries={timeline} today={today} weightUnit={pet.weightUnit} />
        )}
      </Section>

      {pet.notes && (
        <Section title="Notes">
          <Card className="p-4 sm:p-5 text-[15px] leading-relaxed whitespace-pre-wrap">{pet.notes}</Card>
        </Section>
      )}

      <div className="pt-6 border-t border-line flex flex-wrap gap-3">
        {archived ? (
          <ConfirmForm action={restorePetAction} hidden={{ id }} confirm={`Restore ${name} to the household? Their routines and reminders resume.`} variant="secondary" size="sm">
            Restore {name}
          </ConfirmForm>
        ) : (
          <>
            <ConfirmForm action={archivePetAction} hidden={{ id, reason: "Passed away" }} confirm={`Archive ${name} as passed away? Every record is kept, and reminders stop.`} variant="secondary" size="sm">
              Mark as passed away
            </ConfirmForm>
            <ConfirmForm action={archivePetAction} hidden={{ id, reason: "" }} confirm={`Archive ${name}? Every record is kept, and reminders stop. You can restore them any time.`} variant="secondary" size="sm">
              Archive
            </ConfirmForm>
          </>
        )}
        <ConfirmForm action={deletePetAction} hidden={{ id }} confirm={`Permanently delete ${name}? Their health records, routines and care history are deleted. Expenses and documents are kept without the link. Archiving keeps everything instead.`} variant="danger" size="sm">
          Delete permanently
        </ConfirmForm>
      </div>
    </div>
  );
}

function QuickAction({ href, label }: { href: string; label: string }) {
  return (
    <Link href={href} className="flex items-center min-h-12 px-3.5 py-2.5 rounded-xl border border-line bg-surface text-[14px] font-semibold leading-tight text-ink hover:bg-surface-2 transition-colors">
      {label}
    </Link>
  );
}
