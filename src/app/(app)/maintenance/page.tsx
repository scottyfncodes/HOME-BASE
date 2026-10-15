import Link from "next/link";
import { AlertTriangle, CalendarClock, CheckCircle2, History, Plus, Repeat } from "lucide-react";
import { requirePropertyCtx } from "@/core/auth/session";
import { listHistory, listTasks, taskCounts, type TaskView } from "@/core/services/maintenance";
import { describeDue, formatDate, todayIn } from "@/core/domain/dates";
import { formatCents } from "@/core/domain/money";
import { ButtonLink } from "@/components/ui/button";
import { Card, EmptyState, PageHeader, Pill, Row, Tabs } from "@/components/ui/page";
import { TASK_SUGGESTIONS } from "@/features/learn/guides";

export const metadata = { title: "Maintenance" };

export default async function MaintenancePage({ searchParams }: { searchParams: Promise<{ view?: string }> }) {
  const { view: raw } = await searchParams;
  const view = (["upcoming", "overdue", "all", "completed", "history"] as const).includes(raw as never) ? (raw as TaskView | "history") : "upcoming";
  const ctx = await requirePropertyCtx();
  const today = todayIn(ctx.timezone);
  const counts = await taskCounts(ctx);
  const tasks = view === "history" ? [] : await listTasks(ctx, view === "upcoming" ? "all" : view);
  const history = view === "history" ? await listHistory(ctx, { limit: 100 }) : [];

  const tabs = [
    { href: "/maintenance", label: "Scheduled", count: counts.scheduled },
    { href: "/maintenance?view=overdue", label: "Overdue", count: counts.overdue },
    { href: "/maintenance?view=history", label: "History" },
    { href: "/maintenance?view=completed", label: "Done (one-time)" },
  ];
  const current = view === "upcoming" ? "/maintenance" : `/maintenance?view=${view}`;

  // Group scheduled tasks by urgency.
  const groups = view === "upcoming" ? groupTasks(tasks, today) : [{ label: null, items: tasks }];

  return (
    <>
      <PageHeader
        title="Maintenance"
        description={counts.scheduled === 0 ? "Recurring upkeep, scheduled once and tracked forever." : counts.overdue > 0 ? `${counts.overdue} overdue · ${counts.dueSoon} due in the next two weeks.` : counts.dueSoon > 0 ? `${counts.dueSoon} due in the next two weeks.` : "Nothing is overdue."}
        actions={
          <>
            <ButtonLink href="/maintenance/history/new" size="sm" variant="secondary">
              <History className="size-4" aria-hidden /> Log work
            </ButtonLink>
            <ButtonLink href="/maintenance/new" size="sm">
              <Plus className="size-4" aria-hidden /> Schedule
            </ButtonLink>
          </>
        }
      />
      <div className="mb-4">
        <Tabs tabs={tabs} current={current} />
      </div>

      {view === "history" ? (
        history.length === 0 ? (
          <EmptyState icon={<History />} title="No history yet" description="Completed tasks land here automatically. You can also log past work, like the furnace service you had last spring." action={<ButtonLink href="/maintenance/history/new" variant="secondary">Log past work</ButtonLink>} />
        ) : (
          <Card className="divide-y divide-line overflow-hidden">
            {history.map((h) => (
              <Row key={h.id} icon={<CheckCircle2 className="text-ok" />} title={h.title} subtitle={[h.asset?.name, h.provider?.name, h.notes].filter(Boolean).join(" · ") || undefined} meta={<span>{formatDate(h.completedOn)}{h.costCents ? <><br />{formatCents(h.costCents)}</> : null}</span>} />
            ))}
          </Card>
        )
      ) : tasks.length === 0 ? (
        view === "upcoming" ? (
          <div className="flex flex-col gap-6">
            <EmptyState icon={<CalendarClock />} title="Nothing scheduled yet" description="Pick a few of the usual suspects below, or schedule something specific to your home." action={<ButtonLink href="/maintenance/new">Schedule a task</ButtonLink>} />
            <Suggestions />
          </div>
        ) : (
          <EmptyState compact icon={view === "overdue" ? <CheckCircle2 /> : <CalendarClock />} title={view === "overdue" ? "Nothing overdue" : "Nothing here"} description={view === "overdue" ? "Everything is on schedule." : undefined} />
        )
      ) : (
        <div className="flex flex-col gap-6">
          {groups.map((g) => (
            <section key={g.label ?? "all"} className="flex flex-col gap-3">
              {g.label && <h2 className="eyebrow">{g.label}</h2>}
              <Card className="divide-y divide-line overflow-hidden">
                {g.items.map((t) => {
                  const overdue = t.status === "scheduled" && t.dueOn < today;
                  return (
                    <Row
                      key={t.id}
                      href={`/maintenance/${t.id}`}
                      icon={overdue ? <AlertTriangle className="text-danger" /> : t.recurrence ? <Repeat /> : <CalendarClock />}
                      title={t.title}
                      subtitle={[t.asset?.name ?? t.location?.name, t.priority === "high" ? "High priority" : null].filter(Boolean).join(" · ") || undefined}
                      meta={t.status === "scheduled" ? <span className={overdue ? "text-danger font-semibold" : undefined}>{describeDue(t.dueOn, today)}</span> : <Pill tone={t.status === "completed" ? "ok" : "neutral"}>{t.status}</Pill>}
                    />
                  );
                })}
              </Card>
            </section>
          ))}
          {view === "upcoming" && tasks.length < 4 && <Suggestions />}
        </div>
      )}
    </>
  );
}

function groupTasks<T extends { dueOn: string }>(tasks: T[], today: string) {
  const overdue = tasks.filter((t) => t.dueOn < today);
  const soon = tasks.filter((t) => t.dueOn >= today && t.dueOn <= addDaysStr(today, 14));
  const later = tasks.filter((t) => t.dueOn > addDaysStr(today, 14));
  const out: Array<{ label: string | null; items: T[] }> = [];
  if (overdue.length) out.push({ label: "Overdue", items: overdue });
  if (soon.length) out.push({ label: "Next two weeks", items: soon });
  if (later.length) out.push({ label: "Later", items: later });
  return out;
}

function addDaysStr(date: string, days: number) {
  const [y, m, d] = date.split("-").map(Number);
  const dt = new Date(Date.UTC(y, m - 1, d + days));
  return dt.toISOString().slice(0, 10);
}

function Suggestions() {
  return (
    <section className="flex flex-col gap-3">
      <h2 className="eyebrow">Common tasks</h2>
      <div className="flex flex-wrap gap-2">
        {TASK_SUGGESTIONS.slice(0, 10).map((s) => (
          <Link
            key={s.title}
            href={`/maintenance/new?title=${encodeURIComponent(s.title)}&recurrence=${s.recurrence}${s.guideSlug ? `&guide=${s.guideSlug}` : ""}`}
            className="inline-flex items-center gap-1.5 h-9 rounded-full border border-line bg-surface px-3.5 text-sm font-medium hover:bg-surface-2"
          >
            <Plus className="size-3.5 text-brand" aria-hidden /> {s.title}
          </Link>
        ))}
      </div>
    </section>
  );
}
