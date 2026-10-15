import Link from "next/link";
import { CheckCircle2, FileText, Package, Pencil, Plus, Receipt, Trash2 } from "lucide-react";
import { requirePropertyCtx } from "@/core/auth/session";
import { getProject } from "@/core/services/projects";
import { listAssets } from "@/core/services/assets";
import { orNotFound } from "@/lib/not-found";
import { PROJECT_STATUS_LABELS, DOCUMENT_CATEGORY_LABELS } from "@/core/domain/validation";
import { formatDate, todayIn } from "@/core/domain/dates";
import { formatCents } from "@/core/domain/money";
import { ButtonLink } from "@/components/ui/button";
import { Card, DescriptionList, EmptyState, PageHeader, Pill, Row, Section } from "@/components/ui/page";
import { ConfirmForm } from "@/components/ui/confirm-form";
import { DocumentThumb } from "@/components/documents/document-thumb";
import { deleteExpenseAction, deleteProjectAction, setProjectStatusAction, unlinkAssetAction } from "../actions";
import { Checklist, LinkAssetForm } from "./panels";

export default async function ProjectPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const ctx = await requirePropertyCtx();
  const [project, allAssets] = await Promise.all([orNotFound(getProject(ctx, id)), listAssets(ctx)]);
  const today = todayIn(ctx.timezone);
  const linkedIds = new Set(project.assets.map((a) => a.assetId));
  const linkable = allAssets.filter((a) => !linkedIds.has(a.id));
  const done = project.tasks.filter((t) => t.completedOn).length;
  const overBudget = project.budgetCents != null && project.spentCents > project.budgetCents;
  const open = !["completed", "cancelled"].includes(project.status);

  return (
    <>
      <PageHeader
        back={{ href: "/projects", label: "Projects" }}
        eyebrow={
          <span className="inline-flex items-center gap-2">
            <Pill tone={project.status === "in_progress" ? "brand" : project.status === "completed" ? "ok" : "neutral"}>{PROJECT_STATUS_LABELS[project.status]}</Pill>
            {project.priority === "high" && <Pill tone="accent">High priority</Pill>}
            {project.location && <span>{project.location.name}</span>}
          </span>
        }
        title={project.name}
        description={project.description}
        actions={
          <ButtonLink href={`/projects/${id}/edit`} variant="secondary" size="sm">
            <Pencil className="size-4" aria-hidden /> Edit
          </ButtonLink>
        }
      />
      <div className="flex flex-col gap-6">
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <div className="card p-4">
            <div className={`figure text-2xl ${overBudget ? "text-danger" : ""}`}>{formatCents(project.spentCents, { compact: true }) || "$0"}</div>
            <div className="eyebrow mt-2">Spent{project.budgetCents != null ? ` of ${formatCents(project.budgetCents, { compact: true })}` : ""}</div>
          </div>
          <div className="card p-4">
            <div className="figure text-2xl">{project.tasks.length ? `${done}/${project.tasks.length}` : "–"}</div>
            <div className="eyebrow mt-2">Steps done</div>
          </div>
          <div className="card p-4 col-span-2">
            <DescriptionList
              items={[
                project.startOn && { label: "Started", value: formatDate(project.startOn) },
                project.targetOn && { label: "Target", value: <span className={open && project.targetOn < today ? "text-danger" : undefined}>{formatDate(project.targetOn)}</span> },
                project.completedOn && { label: "Completed", value: formatDate(project.completedOn) },
                !project.startOn && !project.targetOn && !project.completedOn && { label: "Timeline", value: "Not set" },
              ]}
            />
          </div>
        </div>

        {open && (
          <div className="flex flex-wrap gap-2">
            {project.status !== "in_progress" && (
              <ConfirmForm action={setProjectStatusAction} hidden={{ id, status: "in_progress" }} confirm="Mark this project as in progress?" variant="primary" size="sm">
                Start work
              </ConfirmForm>
            )}
            {project.status === "in_progress" && (
              <ConfirmForm action={setProjectStatusAction} hidden={{ id, status: "on_hold" }} confirm="Put this project on hold?" variant="secondary" size="sm">
                Put on hold
              </ConfirmForm>
            )}
            <ConfirmForm action={setProjectStatusAction} hidden={{ id, status: "completed" }} confirm="Mark this project as completed?" variant="secondary" size="sm">
              <CheckCircle2 className="size-4" aria-hidden /> Mark complete
            </ConfirmForm>
          </div>
        )}

        <Section title="Checklist" description="Steps and milestones.">
          <Checklist projectId={id} tasks={project.tasks} />
        </Section>

        <Section
          title="Expenses"
          action={
            <ButtonLink href={`/projects/${id}/expenses/new`} variant="ghost" size="sm">
              <Plus className="size-4" aria-hidden /> Add
            </ButtonLink>
          }
        >
          {project.expenses.length === 0 ? (
            <EmptyState compact icon={<Receipt />} title="No expenses yet" description="Materials, labor, permits. Totals roll up against the budget." action={<ButtonLink href={`/projects/${id}/expenses/new`} size="sm" variant="secondary">Add an expense</ButtonLink>} />
          ) : (
            <Card className="divide-y divide-line overflow-hidden">
              {project.expenses.map((e) => (
                <Row
                  key={e.id}
                  icon={<Receipt />}
                  title={e.title}
                  subtitle={[formatDate(e.spentOn), e.category, e.provider?.name].filter(Boolean).join(" · ")}
                  meta={formatCents(e.amountCents)}
                  trailing={<ConfirmForm action={deleteExpenseAction} hidden={{ id: e.id }} confirm={`Remove "${e.title}"?`} variant="ghost" size="sm" className="ml-1"><Trash2 className="size-4" aria-label="Remove expense" /></ConfirmForm>}
                />
              ))}
            </Card>
          )}
        </Section>

        <Section title="Items involved">
          {project.assets.length > 0 && (
            <Card className="divide-y divide-line overflow-hidden">
              {project.assets.map((pa) => (
                <Row key={pa.assetId} href={`/inventory/${pa.assetId}`} icon={<Package />} title={pa.asset.name} subtitle={[pa.asset.manufacturer, pa.asset.model].filter(Boolean).join(" ") || undefined} trailing={<ConfirmForm action={unlinkAssetAction} hidden={{ projectId: id, assetId: pa.assetId }} confirm={`Unlink "${pa.asset.name}" from this project?`} variant="ghost" size="sm" className="ml-1">Unlink</ConfirmForm>} />
              ))}
            </Card>
          )}
          <LinkAssetForm projectId={id} assets={linkable.map((a) => ({ id: a.id, name: a.name }))} />
        </Section>

        <Section
          title="Documents"
          action={
            <ButtonLink href={`/documents/new?projectId=${id}`} variant="ghost" size="sm">
              <Plus className="size-4" aria-hidden /> Add
            </ButtonLink>
          }
        >
          {project.documents.length === 0 ? (
            <EmptyState compact icon={<FileText />} title="No documents" description="Estimates, permits, before-and-after photos." />
          ) : (
            <Card className="divide-y divide-line overflow-hidden">
              {project.documents.map((d) => (
                <Row key={d.id} href={`/documents/${d.id}`} icon={<DocumentThumb file={d.file} />} title={d.title} subtitle={DOCUMENT_CATEGORY_LABELS[d.category as keyof typeof DOCUMENT_CATEGORY_LABELS] ?? d.category} />
              ))}
            </Card>
          )}
        </Section>

        {project.notes && (
          <Card className="p-4 sm:p-5">
            <div className="eyebrow mb-1">Notes</div>
            <p className="whitespace-pre-wrap text-[15px]">{project.notes}</p>
          </Card>
        )}

        <div className="pt-4 border-t border-line flex flex-wrap gap-3">
          {open && (
            <ConfirmForm action={setProjectStatusAction} hidden={{ id, status: "cancelled" }} confirm="Cancel this project? It moves to Finished and can be reopened from Edit." variant="secondary" size="sm">
              Cancel project
            </ConfirmForm>
          )}
          <ConfirmForm action={deleteProjectAction} hidden={{ id }} confirm={`Delete "${project.name}"? Expenses and documents are kept but unlinked; the checklist is removed.`} variant="danger" size="sm">
            Delete project
          </ConfirmForm>
        </div>
        <p className="text-xs text-ink-3">
          <Link href="/projects" className="text-brand font-semibold">All projects</Link>
        </p>
      </div>
    </>
  );
}
