import { requirePropertyCtx } from "@/core/auth/session";
import { getTask } from "@/core/services/maintenance";
import { listAssets } from "@/core/services/assets";
import { listLocations } from "@/core/services/locations";
import { todayIn } from "@/core/domain/dates";
import { orNotFound } from "@/lib/not-found";
import { PageHeader } from "@/components/ui/page";
import { TaskForm } from "../../task-form";

export const metadata = { title: "Edit task" };

export default async function EditTaskPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const ctx = await requirePropertyCtx();
  const [task, assets, locations] = await Promise.all([orNotFound(getTask(ctx, id)), listAssets(ctx), listLocations(ctx)]);
  return (
    <>
      <PageHeader back={{ href: `/maintenance/${id}`, label: task.title }} title="Edit task" />
      <TaskForm task={task} assets={assets.map((a) => ({ id: a.id, name: a.name }))} locations={locations.map((l) => ({ id: l.id, name: l.name }))} today={todayIn(ctx.timezone)} cancelHref={`/maintenance/${id}`} />
    </>
  );
}
