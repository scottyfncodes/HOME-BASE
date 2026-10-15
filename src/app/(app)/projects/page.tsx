import { Hammer, Plus } from "lucide-react";
import { requirePropertyCtx } from "@/core/auth/session";
import { listProjects } from "@/core/services/projects";
import { PROJECT_STATUS_LABELS } from "@/core/domain/validation";
import { formatDate } from "@/core/domain/dates";
import { formatCents } from "@/core/domain/money";
import { ButtonLink } from "@/components/ui/button";
import { Card, EmptyState, PageHeader, Pill, Row, Tabs } from "@/components/ui/page";

export const metadata = { title: "Projects" };

const TONE: Record<string, "brand" | "neutral" | "warn" | "ok" | "info"> = { in_progress: "brand", planned: "info", idea: "neutral", on_hold: "warn", completed: "ok", cancelled: "neutral" };

export default async function ProjectsPage({ searchParams }: { searchParams: Promise<{ view?: string }> }) {
  const { view: raw } = await searchParams;
  const view = raw === "closed" ? "closed" : "open";
  const ctx = await requirePropertyCtx();
  const projects = await listProjects(ctx, view);
  return (
    <>
      <PageHeader
        title="Projects"
        description="Repairs, upgrades and renovations, with a checklist and a running tally of what they cost."
        actions={
          <ButtonLink href="/projects/new" size="sm">
            <Plus className="size-4" aria-hidden /> New project
          </ButtonLink>
        }
      />
      <div className="mb-4">
        <Tabs tabs={[{ href: "/projects", label: "Open" }, { href: "/projects?view=closed", label: "Finished" }]} current={view === "open" ? "/projects" : "/projects?view=closed"} />
      </div>
      {projects.length === 0 ? (
        view === "open" ? (
          <EmptyState icon={<Hammer />} title="No projects yet" description="Anything from swapping a faucet to a full kitchen. Track steps, link the items involved, and keep receipts against the budget." action={<ButtonLink href="/projects/new">Start a project</ButtonLink>} />
        ) : (
          <EmptyState compact icon={<Hammer />} title="Nothing finished yet" />
        )
      ) : (
        <Card className="divide-y divide-line overflow-hidden">
          {projects.map((p) => (
            <Row
              key={p.id}
              href={`/projects/${p.id}`}
              icon={<Hammer />}
              title={p.name}
              subtitle={[p.taskCount > 0 ? `${p.doneCount}/${p.taskCount} steps` : null, p.budgetCents ? `${formatCents(p.spentCents, { compact: true })} of ${formatCents(p.budgetCents, { compact: true })}` : p.spentCents > 0 ? `${formatCents(p.spentCents, { compact: true })} spent` : null, p.targetOn && p.status !== "completed" ? `Target ${formatDate(p.targetOn, { year: false })}` : null].filter(Boolean).join(" · ") || undefined}
              trailing={<Pill tone={TONE[p.status]}>{PROJECT_STATUS_LABELS[p.status]}</Pill>}
            />
          ))}
        </Card>
      )}
    </>
  );
}
