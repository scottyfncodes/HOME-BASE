import Link from "next/link";
import { AlertTriangle, ArrowRight, CalendarClock, DoorOpen, Hammer, HousePlus, LifeBuoy, Package, Plus, ShieldAlert } from "lucide-react";
import { requirePropertyCtx } from "@/core/auth/session";
import { getDashboard } from "@/core/services/dashboard";
import { getProperty } from "@/core/services/property";
import { describeDue, formatDate } from "@/core/domain/dates";
import { PREPAREDNESS_KIND_LABELS } from "@/core/domain/validation";
import { ButtonLink } from "@/components/ui/button";
import { Card, EmptyState, PageHeader, Pill, Row, Section, Stat } from "@/components/ui/page";

export const metadata = { title: "Home" };

export default async function HomePage() {
  const ctx = await requirePropertyCtx();
  const [property, dash] = await Promise.all([getProperty(ctx), getDashboard(ctx)]);
  const greeting = greet(dash.today, ctx.timezone);

  return (
    <>
      <PageHeader
        eyebrow={formatDate(dash.today, { month: "long" })}
        title={`${greeting}, ${ctx.user.name.split(" ")[0]}`}
        description={dash.isEmpty ? "Your Home Base is ready. Add a few things and this page will start earning its keep." : summaryLine(dash)}
      />

      {dash.isEmpty ? (
        <div className="flex flex-col gap-6">
          <EmptyState
            icon={<HousePlus />}
            title={`Start building ${property.name}`}
            description="Nothing here is required. Add what you have, when you have time, and Home Base will keep it organized."
            action={
              <>
                <ButtonLink href="/inventory/new">
                  <Plus className="size-4" aria-hidden /> Add an appliance or system
                </ButtonLink>
                <ButtonLink href="/maintenance/new" variant="secondary">
                  Schedule maintenance
                </ButtonLink>
              </>
            }
          />
          <Section title="Good first steps">
            <Card className="divide-y divide-line overflow-hidden">
              <Row href="/my-home" icon={<DoorOpen />} title="Set up rooms" subtitle="Give your systems a place to live." />
              <Row href="/preparedness" icon={<LifeBuoy />} title="Record shutoffs" subtitle="Water, gas and electrical, findable in seconds." />
              <Row href="/documents/new" icon={<Package />} title="File a manual" subtitle="Attach it to the appliance it belongs to." />
            </Card>
          </Section>
        </div>
      ) : (
        <div className="flex flex-col gap-6">
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <Stat label="Overdue" value={dash.taskCounts.overdue} tone={dash.taskCounts.overdue > 0 ? "danger" : "neutral"} href="/maintenance?view=overdue" />
            <Stat label="Due in 14 days" value={dash.taskCounts.dueSoon} tone={dash.taskCounts.dueSoon > 0 ? "warn" : "neutral"} href="/maintenance" />
            <Stat label="Projects active" value={dash.projectCounts.inProgress} tone="brand" href="/projects" />
            <Stat label="Items tracked" value={dash.assetCount} href="/inventory" />
          </div>

          {dash.overdue.length > 0 && (
            <Section title="Needs attention" action={<Link href="/maintenance?view=overdue" className="text-sm font-semibold text-brand">See all</Link>}>
              <Card className="divide-y divide-line overflow-hidden">
                {dash.overdue.slice(0, 5).map((t) => (
                  <Row
                    key={t.id}
                    href={`/maintenance/${t.id}`}
                    icon={<AlertTriangle className="text-danger" />}
                    title={t.title}
                    subtitle={t.asset?.name ?? t.location?.name ?? undefined}
                    meta={<span className="text-danger font-semibold">{describeDue(t.dueOn, dash.today)}</span>}
                  />
                ))}
              </Card>
            </Section>
          )}

          <Section title="Coming up" action={<Link href="/maintenance" className="text-sm font-semibold text-brand">Maintenance</Link>}>
            {dash.upcoming.length === 0 ? (
              <EmptyState
                compact
                icon={<CalendarClock />}
                title="Nothing scheduled in the next 30 days"
                description="Set up recurring tasks like filter changes and detector checks so they come to you."
                action={<ButtonLink href="/maintenance/new" variant="secondary" size="sm">Schedule a task</ButtonLink>}
              />
            ) : (
              <Card className="divide-y divide-line overflow-hidden">
                {dash.upcoming.slice(0, 6).map((t) => (
                  <Row
                    key={t.id}
                    href={`/maintenance/${t.id}`}
                    icon={<CalendarClock />}
                    title={t.title}
                    subtitle={t.asset?.name ?? t.location?.name ?? undefined}
                    meta={describeDue(t.dueOn, dash.today)}
                  />
                ))}
              </Card>
            )}
          </Section>

          {(dash.warranties.length > 0 || dash.expiringDocs.length > 0) && (
            <Section title="Expiring soon">
              <Card className="divide-y divide-line overflow-hidden">
                {dash.warranties.map((a) => (
                  <Row key={a.id} href={`/inventory/${a.id}`} icon={<ShieldAlert className="text-warn" />} title={`${a.name} warranty`} subtitle={a.manufacturer ?? undefined} meta={formatDate(a.warrantyExpiresOn)} />
                ))}
                {dash.expiringDocs.map((d) => (
                  <Row key={d.id} href={`/documents/${d.id}`} icon={<ShieldAlert className="text-warn" />} title={d.title} subtitle={d.category} meta={formatDate(d.expiresOn)} />
                ))}
              </Card>
            </Section>
          )}

          {dash.projects.length > 0 && (
            <Section title="In progress" action={<Link href="/projects" className="text-sm font-semibold text-brand">Projects</Link>}>
              <Card className="divide-y divide-line overflow-hidden">
                {dash.projects.map((p) => (
                  <Row
                    key={p.id}
                    href={`/projects/${p.id}`}
                    icon={<Hammer />}
                    title={p.name}
                    subtitle={p.taskCount > 0 ? `${p.doneCount}/${p.taskCount} steps done` : "No checklist yet"}
                    meta={p.targetOn ? `Target ${formatDate(p.targetOn, { year: false })}` : undefined}
                  />
                ))}
              </Card>
            </Section>
          )}

          <Section title="Quick reach">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {dash.shutoffs.length > 0 ? (
                dash.shutoffs.map((s) => (
                  <Link key={s.id} href={`/preparedness/${s.id}`} className="card p-4 flex items-start gap-3 hover:bg-surface-2/60">
                    <div className="size-10 rounded-xl bg-accent-soft text-accent flex items-center justify-center shrink-0">
                      <LifeBuoy className="size-5" aria-hidden />
                    </div>
                    <div className="min-w-0 pt-2">
                      <div className="flex items-center gap-2 min-h-6">
                        <span className="font-semibold leading-snug truncate">{s.title}</span>
                        <Pill tone="accent">{PREPAREDNESS_KIND_LABELS[s.kind]}</Pill>
                      </div>
                      <div className="text-sm text-ink-2 truncate mt-0.5">{s.whereText ?? "Location not recorded"}</div>
                    </div>
                  </Link>
                ))
              ) : (
                <QuickLink href="/preparedness/new?kind=water_shutoff" icon={<LifeBuoy />} title="Where is your water shutoff?" body="Record it now so you can find it in a hurry." />
              )}
              <QuickLink href="/inventory/new" icon={<Plus />} title="Add an item" body="Appliance, system or equipment." />
            </div>
          </Section>
        </div>
      )}
    </>
  );
}

function QuickLink({ href, icon, title, body }: { href: string; icon: React.ReactNode; title: string; body: string }) {
  return (
    <Link href={href} className="card p-4 flex items-start gap-3 hover:bg-surface-2/60 transition-colors">
      <div className="size-10 rounded-xl bg-brand-soft text-brand flex items-center justify-center shrink-0 [&>svg]:size-5">{icon}</div>
      <div className="min-w-0 flex-1 pt-2">
        <div className="font-semibold leading-6">{title}</div>
        <div className="text-sm text-ink-2 mt-0.5">{body}</div>
      </div>
      <ArrowRight className="size-4 text-ink-3 mt-3 shrink-0" aria-hidden />
    </Link>
  );
}

function greet(_today: string, timeZone: string) {
  const hour = Number(new Intl.DateTimeFormat("en-US", { timeZone, hour: "numeric", hour12: false }).format(new Date()));
  if (hour < 5) return "Good night";
  if (hour < 12) return "Good morning";
  if (hour < 17) return "Good afternoon";
  return "Good evening";
}

function summaryLine(d: Awaited<ReturnType<typeof getDashboard>>) {
  const parts: string[] = [];
  if (d.taskCounts.overdue > 0) parts.push(`${d.taskCounts.overdue} overdue`);
  if (d.taskCounts.dueSoon > 0) parts.push(`${d.taskCounts.dueSoon} due soon`);
  if (d.projectCounts.inProgress > 0) parts.push(`${d.projectCounts.inProgress} project${d.projectCounts.inProgress === 1 ? "" : "s"} in progress`);
  if (parts.length === 0) return "Everything is on track. Nothing is overdue.";
  return `${parts.join(" · ")}.`;
}
