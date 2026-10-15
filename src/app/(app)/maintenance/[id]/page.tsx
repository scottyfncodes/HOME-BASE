import Link from "next/link";
import { BookOpen, CheckCircle2, History, Pencil, Repeat } from "lucide-react";
import { requirePropertyCtx } from "@/core/auth/session";
import { getTask, getTaskHistory } from "@/core/services/maintenance";
import { orNotFound } from "@/lib/not-found";
import { describeDue, formatDate, todayIn } from "@/core/domain/dates";
import { describeRecurrence } from "@/core/domain/recurrence";
import { formatCents } from "@/core/domain/money";
import { getGuide, guidesForTaskTitle } from "@/features/learn/guides";
import { ButtonLink } from "@/components/ui/button";
import { Card, DescriptionList, EmptyState, PageHeader, Pill, Row, Section } from "@/components/ui/page";
import { ConfirmForm } from "@/components/ui/confirm-form";
import { cancelTaskAction, deleteTaskAction } from "../actions";
import { RescheduleForm } from "./reschedule-form";

export default async function TaskPage({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<{ completed?: string }> }) {
  const { id } = await params;
  const { completed } = await searchParams;
  const ctx = await requirePropertyCtx();
  const [task, history] = await Promise.all([orNotFound(getTask(ctx, id)), getTaskHistory(ctx, id)]);
  const today = todayIn(ctx.timezone);
  const overdue = task.status === "scheduled" && task.dueOn < today;
  const guides = task.guideSlug ? [getGuide(task.guideSlug)].filter(Boolean) : guidesForTaskTitle(task.title);

  return (
    <>
      <PageHeader
        back={{ href: "/maintenance", label: "Maintenance" }}
        eyebrow={
          <span className="inline-flex items-center gap-2">
            {task.recurrence ? describeRecurrence(task.recurrence) : "One-time task"}
            {task.status !== "scheduled" && <Pill tone={task.status === "completed" ? "ok" : "neutral"}>{task.status}</Pill>}
            {task.priority === "high" && <Pill tone="accent">High priority</Pill>}
          </span>
        }
        title={task.title}
        description={task.description}
        actions={
          task.status === "scheduled" && (
            <ButtonLink href={`/maintenance/${id}/edit`} variant="secondary" size="sm">
              <Pencil className="size-4" aria-hidden /> Edit
            </ButtonLink>
          )
        }
      />

      <div className="flex flex-col gap-6">
        {completed && (
          <div className="rounded-xl bg-ok-soft text-ok px-4 py-3 text-sm font-medium flex items-center gap-2">
            <CheckCircle2 className="size-4" aria-hidden />
            {task.status === "scheduled" ? `Recorded. Next due ${formatDate(task.dueOn)}.` : "Recorded and closed."}
          </div>
        )}

        {task.status === "scheduled" && (
          <Card className={`p-4 sm:p-5 flex flex-wrap items-center justify-between gap-4 ${overdue ? "border-danger/40" : ""}`}>
            <div>
              <div className="text-xs font-semibold uppercase tracking-wider text-ink-3">Due</div>
              <div className={`font-display text-2xl font-semibold ${overdue ? "text-danger" : ""}`}>{describeDue(task.dueOn, today)}</div>
              <div className="text-sm text-ink-2">{formatDate(task.dueOn, { month: "long" })}</div>
            </div>
            <ButtonLink href={`/maintenance/${id}/complete`} size="lg">
              <CheckCircle2 className="size-5" aria-hidden /> Mark complete
            </ButtonLink>
          </Card>
        )}

        <Card className="p-4 sm:p-5">
          <DescriptionList
            items={[
              task.asset && { label: "Item", value: <Link href={`/inventory/${task.asset.id}`} className="font-semibold text-brand">{task.asset.name}</Link> },
              task.location && { label: "Room / area", value: <Link href={`/my-home/locations/${task.location.id}`} className="font-semibold text-brand">{task.location.name}</Link> },
              task.recurrence && { label: "Repeats", value: `${describeRecurrence(task.recurrence)}, from the ${task.recurrence.anchor === "completed" ? "completion date" : "due date"}` },
              task.estimatedMinutes && { label: "Takes about", value: `${task.estimatedMinutes} min` },
              history.length > 0 && { label: "Last done", value: formatDate(history[0].completedOn) },
            ]}
          />
        </Card>

        <Section title="History">
          {history.length === 0 ? (
            <EmptyState compact icon={<History />} title="Not completed yet" description="Each completion is kept here with notes and cost." />
          ) : (
            <Card className="divide-y divide-line overflow-hidden">
              {history.map((h) => (
                <Row key={h.id} icon={<CheckCircle2 className="text-ok" />} title={formatDate(h.completedOn, { month: "long" })} subtitle={[h.provider?.name, h.notes].filter(Boolean).join(" · ") || (h.scheduledFor && h.scheduledFor !== h.completedOn ? `Was due ${formatDate(h.scheduledFor)}` : undefined)} meta={h.costCents ? formatCents(h.costCents) : undefined} />
              ))}
            </Card>
          )}
        </Section>

        {guides.length > 0 && (
          <Section title="How to">
            <Card className="divide-y divide-line overflow-hidden">
              {guides.map((g) => g && <Row key={g.slug} href={`/learn/${g.slug}`} icon={<BookOpen />} title={g.title} subtitle={g.summary} />)}
            </Card>
          </Section>
        )}

        <div className="pt-6 border-t border-line flex flex-wrap items-end gap-3">
          {task.status === "scheduled" ? (
            <ConfirmForm action={cancelTaskAction} hidden={{ id }} confirm={`Cancel "${task.title}"? Its history is kept and you can reschedule it later.`} variant="secondary" size="sm">
              Cancel this task
            </ConfirmForm>
          ) : (
            <RescheduleForm id={id} today={today} />
          )}
          <ConfirmForm action={deleteTaskAction} hidden={{ id }} confirm={`Delete "${task.title}"? Completed history is kept.`} variant="danger" size="sm">
            Delete
          </ConfirmForm>
          {task.recurrence && <span className="text-xs text-ink-3 inline-flex items-center gap-1"><Repeat className="size-3" aria-hidden /> Recurring tasks reschedule themselves when completed.</span>}
        </div>
      </div>
    </>
  );
}
