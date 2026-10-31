import Link from "next/link";
import { AlertTriangle, Droplets, Flame, LifeBuoy, Phone, Plus, ShieldCheck, Siren, StickyNote, Zap } from "lucide-react";
import { requirePropertyCtx } from "@/core/auth/session";
import { listPreparedness } from "@/core/services/preparedness";
import { listHouseholdPetProviders, listPets } from "@/core/services/pets";
import { householdActiveMedications } from "@/core/services/pet-health";
import { PET_PREP_SUGGESTIONS, speciesLabel } from "@/core/domain/pets";
import { PetAvatar } from "@/components/pets/pet-avatar";
import { PetTagIcon } from "@/components/pets/pet-tag-icon";
import { PREPAREDNESS_KINDS, PREPAREDNESS_KIND_LABELS, type PreparednessKind } from "@/core/domain/validation";
import { ButtonLink } from "@/components/ui/button";
import { Card, EmptyState, PageHeader, Row, Section } from "@/components/ui/page";

export const metadata = { title: "Preparedness" };

const ICONS: Record<PreparednessKind, React.ReactNode> = {
  water_shutoff: <Droplets className="text-info" />,
  gas_shutoff: <Flame className="text-accent" />,
  electrical_panel: <Zap className="text-warn" />,
  detector: <Siren className="text-danger" />,
  contact: <Phone />,
  insurance: <ShieldCheck />,
  equipment: <LifeBuoy />,
  note: <StickyNote />,
  pet: <PetTagIcon />,
};

export default async function PreparednessPage() {
  const ctx = await requirePropertyCtx();
  const [items, pets, petTeam, petMeds] = await Promise.all([listPreparedness(ctx), listPets(ctx), listHouseholdPetProviders(ctx), householdActiveMedications(ctx)]);
  const byKind = new Map<PreparednessKind, typeof items>();
  for (const it of items) byKind.set(it.kind, [...(byKind.get(it.kind) ?? []), it]);
  const missingShutoffs = (["water_shutoff", "gas_shutoff", "electrical_panel"] as const).filter((k) => !byKind.has(k));

  return (
    <>
      <PageHeader
        title="Preparedness"
        description="The information you need in the first five minutes of a problem, written down while things are calm."
        actions={
          <ButtonLink href="/preparedness/new" size="sm">
            <Plus className="size-4" aria-hidden /> Add
          </ButtonLink>
        }
      />
      <div className="flex flex-col gap-6">
        {items.length === 0 ? (
          <EmptyState icon={<LifeBuoy />} title="Nothing recorded yet" description="Start with the three shutoffs. Then add detectors, emergency contacts and your insurance claims line." action={<ButtonLink href="/preparedness/new?kind=water_shutoff">Record the water shutoff</ButtonLink>} />
        ) : (
          missingShutoffs.length > 0 && (
            <Card className="p-4 flex flex-col gap-2">
              <div className="font-semibold text-sm">Still missing</div>
              <div className="flex flex-wrap gap-2">
                {missingShutoffs.map((k) => (
                  <Link key={k} href={`/preparedness/new?kind=${k}`} className="inline-flex items-center gap-1.5 h-9 rounded-full border border-line bg-surface px-3.5 text-sm font-medium hover:bg-surface-2">
                    <Plus className="size-3.5 text-brand" aria-hidden /> {PREPAREDNESS_KIND_LABELS[k]}
                  </Link>
                ))}
              </div>
            </Card>
          )
        )}

        {pets.length > 0 && <PetsPlan pets={pets} team={petTeam} meds={petMeds} records={byKind.get("pet") ?? []} />}

        {PREPAREDNESS_KINDS.filter((k) => k !== "pet" && byKind.has(k)).map((k) => (
          <Section key={k} title={PREPAREDNESS_KIND_LABELS[k]}>
            <Card className="divide-y divide-line overflow-hidden">
              {byKind.get(k)!.map((it) => (
                <Row
                  key={it.id}
                  href={`/preparedness/${it.id}`}
                  icon={ICONS[k]}
                  title={it.title}
                  subtitle={it.phone ?? it.whereText ?? it.location?.name ?? (it.instructions ? it.instructions.slice(0, 80) : undefined)}
                  trailing={it.phone ? <a href={`tel:${it.phone.replace(/[^\d+]/g, "")}`} className="ml-1 size-10 rounded-xl bg-brand-soft text-brand flex items-center justify-center" aria-label={`Call ${it.title}`}><Phone className="size-4" aria-hidden /></a> : undefined}
                />
              ))}
            </Card>
          </Section>
        ))}

        <Card className="p-4 sm:p-5 flex flex-col gap-3">
          <div className="flex items-center gap-2 font-semibold">
            <AlertTriangle className="size-4 text-warn" aria-hidden /> Safety first
          </div>
          <ul className="list-disc pl-5 text-sm text-ink-2 flex flex-col gap-1.5">
            <li>If you smell gas: leave the house, then call the gas utility or 911 from outside. Do not touch switches or phones inside.</li>
            <li>Never open an electrical panel beyond its breaker door, and never work on wiring that may be live. Call a licensed electrician.</li>
            <li>Shut off the water main for leaks, but leave plumbing repairs inside walls to a plumber.</li>
            <li>If a CO alarm sounds, get everyone outside and call emergency services.</li>
            {pets.length > 0 && <li>Plan to take every pet with you when you leave: {pets.map((p) => p.name).join(", ")}. Do not leave animals behind, even for what you expect to be a short time.</li>}
            <li>These notes help you act quickly. They are not a substitute for professional help or your local emergency services.</li>
          </ul>
          <Link href="/learn/gas-safety" className="text-sm font-semibold text-brand">Read the gas safety guide</Link>
        </Card>
      </div>
    </>
  );
}

type PrepItem = Awaited<ReturnType<typeof listPreparedness>>[number];

/**
 * Every animal in the household, with what you need to take them along:
 * who to call, how to prove they are yours, and what to grab.
 */
function PetsPlan({ pets, team, meds, records }: { pets: Awaited<ReturnType<typeof listPets>>; team: Awaited<ReturnType<typeof listHouseholdPetProviders>>; meds: Awaited<ReturnType<typeof householdActiveMedications>>; records: PrepItem[] }) {
  const emergencyClinics = [...new Map(team.filter((t) => t.role === "emergency_vet" || t.provider.isEmergency).map((t) => [t.provider.id, t.provider])).values()];
  const titles = new Set(records.map((r) => r.title.toLowerCase()));
  const missing = PET_PREP_SUGGESTIONS.filter((s) => !titles.has(s.title.toLowerCase()));
  const tel = (p: string) => `tel:${p.replace(/[^\d+]/g, "")}`;
  return (
    <Section title="Pets" description={`If you have to leave, ${pets.length === 1 ? pets[0].name + " comes" : "all " + pets.length + " come"} with you. Everything to grab and who to call.`}>
      <Card className="divide-y divide-line overflow-hidden">
        {pets.map((p) => {
          const vet = team.find((t) => t.petId === p.id && t.role === "primary_vet")?.provider ?? team.find((t) => t.petId === p.id && t.role === "vet")?.provider;
          const petMeds = meds.filter((m) => m.petId === p.id);
          return (
            <div key={p.id} className="px-4 py-4 flex gap-3">
              <PetAvatar name={p.name} photoFileId={p.photoFileId} size="lg" />
              <div className="min-w-0 flex-1 flex flex-col gap-1.5">
                <Link href={`/pets/${p.id}`} className="font-display text-xl font-semibold leading-tight hover:text-brand">
                  {p.name}
                </Link>
                <div className="text-sm text-ink-2">{[speciesLabel(p.species, p.speciesDetail), p.breed, p.color].filter(Boolean).join(" · ")}</div>
                <dl className="text-sm grid grid-cols-[auto_1fr] gap-x-3 gap-y-1 mt-1">
                  <dt className="text-ink-3">Microchip</dt>
                  <dd className="min-w-0 break-words">{p.microchipNumber ? <span className="font-mono">{p.microchipNumber}</span> : <Link href={`/pets/${p.id}/edit`} className="text-brand font-semibold">Add</Link>}</dd>
                  <dt className="text-ink-3">Vet</dt>
                  <dd className="min-w-0">{vet ? <>{vet.name}{vet.phone && <> · <a href={tel(vet.phone)} className="text-brand font-semibold">{vet.phone}</a></>}</> : <Link href={`/pets/${p.id}/team/new`} className="text-brand font-semibold">Add</Link>}</dd>
                  {petMeds.length > 0 && (
                    <>
                      <dt className="text-ink-3">Bring</dt>
                      <dd className="min-w-0">{petMeds.map((m) => m.name).join(", ")}</dd>
                    </>
                  )}
                  {(p.insuranceProvider || p.insurancePolicyNumber) && (
                    <>
                      <dt className="text-ink-3">Insurance</dt>
                      <dd className="min-w-0 break-words">{[p.insuranceProvider, p.insurancePolicyNumber].filter(Boolean).join(" · ")}</dd>
                    </>
                  )}
                  {(p.emergencyContactName || p.emergencyContactPhone) && (
                    <>
                      <dt className="text-ink-3">Contact</dt>
                      <dd className="min-w-0">{p.emergencyContactName}{p.emergencyContactPhone && <> {p.emergencyContactName ? "· " : ""}<a href={tel(p.emergencyContactPhone)} className="text-brand font-semibold">{p.emergencyContactPhone}</a></>}</dd>
                    </>
                  )}
                </dl>
              </div>
            </div>
          );
        })}
      </Card>

      {emergencyClinics.length > 0 ? (
        <Card className="divide-y divide-line overflow-hidden">
          {emergencyClinics.map((c) => (
            <Row
              key={c.id}
              href={`/providers/${c.id}`}
              icon={<Siren className="text-danger" />}
              title={c.name}
              subtitle={["Emergency vet", c.afterHoursPhone ? `After hours ${c.afterHoursPhone}` : null, c.address].filter(Boolean).join(" · ")}
              trailing={c.phone || c.afterHoursPhone ? <a href={tel((c.afterHoursPhone ?? c.phone)!)} className="ml-1 size-10 rounded-xl bg-brand-soft text-brand flex items-center justify-center" aria-label={`Call ${c.name}`}><Phone className="size-4" aria-hidden /></a> : undefined}
            />
          ))}
        </Card>
      ) : (
        <Link href={`/pets/${pets[0].id}/team/new?role=emergency_vet`} className="card p-4 flex items-center gap-3 hover:bg-surface-2/60">
          <span className="size-10 rounded-xl bg-danger-soft text-danger flex items-center justify-center shrink-0"><Siren className="size-5" aria-hidden /></span>
          <span className="min-w-0">
            <span className="block font-semibold">Add an emergency vet clinic</span>
            <span className="block text-sm text-ink-2">The after-hours place to call when your regular vet is closed.</span>
          </span>
        </Link>
      )}

      {records.length > 0 && (
        <Card className="divide-y divide-line overflow-hidden">
          {records.map((it) => (
            <Row
              key={it.id}
              href={`/preparedness/${it.id}`}
              icon={<PetTagIcon />}
              title={it.title}
              subtitle={[it.pet?.name ?? "Every pet", it.whereText ?? it.location?.name ?? (it.instructions ? it.instructions.slice(0, 70) : null)].filter(Boolean).join(" · ")}
              trailing={it.phone ? <a href={tel(it.phone)} className="ml-1 size-10 rounded-xl bg-brand-soft text-brand flex items-center justify-center" aria-label={`Call about ${it.title}`}><Phone className="size-4" aria-hidden /></a> : undefined}
            />
          ))}
        </Card>
      )}
      {missing.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {missing.map((m) => (
            <Link key={m.title} href={`/preparedness/new?kind=pet&title=${encodeURIComponent(m.title)}`} className="inline-flex items-center gap-1.5 h-9 rounded-full border border-line bg-surface px-3.5 text-sm font-medium hover:bg-surface-2">
              <Plus className="size-3.5 text-brand" aria-hidden /> {m.title}
            </Link>
          ))}
        </div>
      )}
    </Section>
  );
}
