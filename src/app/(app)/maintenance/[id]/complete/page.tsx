import { requirePropertyCtx } from "@/core/auth/session";
import { getTask } from "@/core/services/maintenance";
import { listProviders } from "@/core/services/providers";
import { todayIn } from "@/core/domain/dates";
import { orNotFound } from "@/lib/not-found";
import { PageHeader } from "@/components/ui/page";
import { CompleteForm } from "./complete-form";

export const metadata = { title: "Complete task" };

export default async function CompleteTaskPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const ctx = await requirePropertyCtx();
  const [task, providers] = await Promise.all([orNotFound(getTask(ctx, id)), listProviders(ctx)]);
  return (
    <>
      <PageHeader back={{ href: `/maintenance/${id}`, label: task.title }} title="Mark complete" description={task.recurrence ? "This records the work and schedules the next occurrence." : "This records the work and closes the task."} />
      <CompleteForm id={id} today={todayIn(ctx.timezone)} providers={providers.map((p) => ({ id: p.id, name: p.name }))} />
    </>
  );
}
