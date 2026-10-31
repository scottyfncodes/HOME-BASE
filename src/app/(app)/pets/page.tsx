import Link from "next/link";
import { Plus } from "lucide-react";
import { requirePropertyCtx } from "@/core/auth/session";
import { countPets, listPets } from "@/core/services/pets";
import { householdCareDue } from "@/core/services/pet-care";
import { householdFollowUps, householdRecentHealth, householdUpcomingVisits, householdVaccinesDue } from "@/core/services/pet-health";
import { getPetSpending } from "@/core/services/pet-spending";
import { describeDue, formatDate, todayIn } from "@/core/domain/dates";
import { describeAge, speciesLabel } from "@/core/domain/pets";
import { formatCents } from "@/core/domain/money";
import { PET_HEALTH_KIND_LABELS, type PetHealthKind } from "@/core/domain/validation";
import { ButtonLink } from "@/components/ui/button";
import { Card, PageHeader, Section } from "@/components/ui/page";
import { PetAvatar, PetPhoto } from "@/components/pets/pet-avatar";
import { cn } from "@/lib/cn";
import { CareDoneButton } from "./care-done-button";

export const metadata = { title: "Pets" };

export default async function PetsPage({ searchParams }: { searchParams: Promise<{ view?: string }> }) {
  const { view } = await searchParams;
  const ctx = await requirePropertyCtx();
  const today = todayIn(ctx.timezone);
  const showArchived = view === "archived";
  const [pets, counts] = await Promise.all([listPets(ctx, { archived: showArchived }), countPets(ctx)]);

  if (showArchived) {
    return (
      <>
        <PageHeader back={{ href: "/pets", label: "Pets" }} title="Archived" description="Pets who have passed away or moved on. Every record is kept." />
        {pets.length === 0 ? (
          <Card className="p-5 text-[15px] text-ink-2">No archived pets.</Card>
        ) : (
          <PetGrid pets={pets} today={today} />
        )}
      </>
    );
  }

  if (pets.length === 0) return <EmptyPets archivedCount={counts.archived} />;

  const [careDue, vaccines, followUps, appointments, pastActivity, spending] = await Promise.all([
    householdCareDue(ctx, 0),
    householdVaccinesDue(ctx, 45),
    householdFollowUps(ctx, 60),
    householdUpcomingVisits(ctx, 90),
    householdRecentHealth(ctx, 5),
    getPetSpending(ctx),
  ]);
  const byId = new Map(pets.map((p) => [p.id, p]));
  const comingUp = [
    ...vaccines.map((v) => ({ key: `v-${v.id}`, petId: v.petId, on: v.nextDueOn, label: v.nextDueOn < today ? "Vaccination overdue" : "Vaccination due", title: v.name, href: `/pets/${v.petId}/health`, overdue: v.nextDueOn < today })),
    ...appointments.map((a) => ({ key: `a-${a.id}`, petId: a.petId, on: a.on, label: "Vet appointment", title: a.title, href: `/pets/${a.petId}/health/${a.id}`, overdue: false })),
    ...followUps.map((f) => ({ key: `f-${f.id}`, petId: f.petId, on: f.followUpOn, label: "Follow-up", title: f.title, href: `/pets/${f.petId}/health/${f.id}`, overdue: f.followUpOn < today })),
  ].sort((a, b) => a.on.localeCompare(b.on));

  return (
    <>
      <PageHeader
        title="Pets"
        description={`Everything that goes into caring for ${joinNames(pets.map((p) => p.name))}.`}
        actions={
          <ButtonLink href="/pets/new" size="sm" variant="secondary">
            <Plus className="size-4" aria-hidden /> Add a pet
          </ButtonLink>
        }
      />

      <div className="flex flex-col gap-8">
        <PetGrid pets={pets} today={today} />

        <nav aria-label="Quick actions" className="flex flex-wrap gap-2">
          <ButtonLink href="/pets/quick/visit" size="sm">Log a vet visit</ButtonLink>
          <ButtonLink href="/pets/quick/vaccination" size="sm" variant="secondary">Record a vaccination</ButtonLink>
          <ButtonLink href="/pets/quick/routine" size="sm" variant="secondary">Schedule care</ButtonLink>
          <ButtonLink href="/pets/quick/expense" size="sm" variant="secondary">Add an expense</ButtonLink>
        </nav>

        <Section title="Today" description={careDue.length === 0 ? "No routines due right now." : undefined}>
          {careDue.length > 0 && (
            <Card className="divide-y divide-line overflow-hidden">
              {careDue.map((t) => (
                <div key={t.id} className="flex items-center gap-3 px-4 py-3 min-h-16">
                  <Link href={`/pets/${t.petId}/care`} className="flex items-center gap-3 min-w-0 flex-1">
                    <PetAvatar name={t.petName} photoFileId={t.petPhotoFileId} size="md" />
                    <div className="min-w-0">
                      <div className="font-medium text-[15px] leading-snug truncate">{t.title}</div>
                      <div className="text-sm text-ink-2 truncate mt-0.5">
                        {t.petName}
                        {t.dueOn < today ? ` · since ${formatDate(t.dueOn, { year: false })}` : ""}
                      </div>
                    </div>
                  </Link>
                  <CareDoneButton petId={t.petId} routineId={t.id} compact />
                </div>
              ))}
            </Card>
          )}
        </Section>

        {comingUp.length > 0 && (
          <Section title="Coming up">
            <Card className="divide-y divide-line overflow-hidden">
              {comingUp.slice(0, 8).map((c) => {
                const p = byId.get(c.petId);
                return (
                  <Link key={c.key} href={c.href} className="flex items-center gap-3 px-4 py-3 min-h-16 hover:bg-surface-2/60">
                    {p && <PetAvatar name={p.name} photoFileId={p.photoFileId} size="md" />}
                    <div className="min-w-0 flex-1">
                      <div className={cn("eyebrow", c.overdue && "text-danger")}>{c.label}</div>
                      <div className="font-medium text-[15px] leading-snug mt-1 truncate">
                        {p?.name}: {c.title}
                      </div>
                    </div>
                    <div className={cn("shrink-0 text-sm text-right", c.overdue ? "text-danger font-semibold" : "text-ink-2")}>{describeDue(c.on, today)}</div>
                  </Link>
                );
              })}
            </Card>
          </Section>
        )}

        {pastActivity.length > 0 && (
          <Section title="Recent health">
            <Card className="divide-y divide-line overflow-hidden">
              {pastActivity.map((r) => {
                const p = byId.get(r.petId);
                return (
                  <Link key={`${r.kind}-${r.id}`} href={r.kind === "vaccination" ? `/pets/${r.petId}/vaccinations/${r.id}` : `/pets/${r.petId}/health/${r.id}`} className="flex items-center gap-3 px-4 py-3 min-h-14 hover:bg-surface-2/60">
                    {p && <PetAvatar name={p.name} photoFileId={p.photoFileId} size="sm" />}
                    <div className="min-w-0 flex-1">
                      <div className="text-[15px] leading-snug truncate">
                        <span className="font-medium">{r.title}</span>
                      </div>
                      <div className="text-sm text-ink-2 truncate">{[p?.name, r.kind === "vaccination" ? "Vaccination" : PET_HEALTH_KIND_LABELS[r.kind as PetHealthKind]].filter(Boolean).join(" · ")}</div>
                    </div>
                    <div className="shrink-0 text-sm text-ink-2 tabular-nums">{formatDate(r.on, { year: false })}</div>
                  </Link>
                );
              })}
            </Card>
          </Section>
        )}

        <Section title="Spending" action={<Link href="/pets/spending" className="text-sm font-semibold text-brand">Details</Link>}>
          <Link href="/pets/spending" className="card p-4 sm:p-5 grid grid-cols-2 gap-4 hover:bg-surface-2/50 transition-colors">
            <div>
              <div className="eyebrow">This month</div>
              <div className="figure text-[26px] mt-2">{formatCents(spending.month, { compact: true })}</div>
            </div>
            <div>
              <div className="eyebrow">{spending.year} so far</div>
              <div className="figure text-[26px] mt-2">{formatCents(spending.yearToDate, { compact: true })}</div>
            </div>
          </Link>
        </Section>

        {counts.archived > 0 && (
          <Link href="/pets?view=archived" className="text-sm font-semibold text-brand w-fit">
            Archived pets ({counts.archived})
          </Link>
        )}
      </div>
    </>
  );
}

function PetGrid({ pets, today }: { pets: Awaited<ReturnType<typeof listPets>>; today: string }) {
  return (
    <ul className={cn("grid gap-3 sm:gap-4", pets.length === 1 ? "grid-cols-1 max-w-sm" : "grid-cols-2 sm:grid-cols-3 lg:grid-cols-4")}>
      {pets.map((p) => {
        const age = describeAge(p.birthDate, today, p.birthDateEstimated);
        return (
          <li key={p.id}>
            <Link href={`/pets/${p.id}`} className="group block card overflow-hidden hover:border-line-strong transition-colors">
              <div className="aspect-[4/5] overflow-hidden">
                <PetPhoto name={p.name} photoFileId={p.photoFileId} />
              </div>
              <div className="px-3.5 py-3">
                <div className="font-display text-[20px] leading-tight font-semibold truncate">{p.name}</div>
                <div className="text-sm text-ink-2 mt-1 truncate">{[p.breed ?? speciesLabel(p.species, p.speciesDetail), age].filter(Boolean).join(" · ")}</div>
              </div>
            </Link>
          </li>
        );
      })}
    </ul>
  );
}

function EmptyPets({ archivedCount }: { archivedCount: number }) {
  return (
    <>
      <PageHeader title="Pets" />
      <section className="card p-6 sm:p-10 flex flex-col gap-5 max-w-2xl">
        <div className="flex flex-col gap-2">
          <h2 className="font-display text-[26px] sm:text-[30px] leading-tight font-semibold tracking-tight">Who else lives here?</h2>
          <p className="text-[15px] leading-relaxed text-ink-2 max-w-prose">
            Give each animal in the household a profile: the dog, the cats, the parakeet, the backyard hens. Their vet, vaccinations, medications, daily routines, spending and paperwork will all live in one calm place, and they will be part of your emergency plan.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <ButtonLink href="/pets/new?species=dog">Add a dog</ButtonLink>
          <ButtonLink href="/pets/new?species=cat" variant="secondary">Add a cat</ButtonLink>
          <ButtonLink href="/pets/new" variant="secondary">Another animal</ButtonLink>
        </div>
        <p className="text-sm text-ink-3">Only a name is required. Unknown birthdays and breeds are fine.</p>
      </section>
      {archivedCount > 0 && (
        <Link href="/pets?view=archived" className="mt-6 inline-block text-sm font-semibold text-brand">
          Archived pets ({archivedCount})
        </Link>
      )}
    </>
  );
}

function joinNames(names: string[]) {
  if (names.length <= 1) return names[0] ?? "";
  if (names.length === 2) return `${names[0]} and ${names[1]}`;
  if (names.length > 4) return `${names.slice(0, 3).join(", ")} and ${names.length - 3} more`;
  return `${names.slice(0, -1).join(", ")} and ${names.at(-1)}`;
}
