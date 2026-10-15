import Link from "next/link";
import { AlertTriangle, Droplets, Flame, LifeBuoy, Phone, Plus, ShieldCheck, Siren, StickyNote, Zap } from "lucide-react";
import { requirePropertyCtx } from "@/core/auth/session";
import { listPreparedness } from "@/core/services/preparedness";
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
};

export default async function PreparednessPage() {
  const ctx = await requirePropertyCtx();
  const items = await listPreparedness(ctx);
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

        {PREPAREDNESS_KINDS.filter((k) => byKind.has(k)).map((k) => (
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
            <li>These notes help you act quickly. They are not a substitute for professional help or your local emergency services.</li>
          </ul>
          <Link href="/learn/gas-safety" className="text-sm font-semibold text-brand">Read the gas safety guide</Link>
        </Card>
      </div>
    </>
  );
}
