import { requirePropertyCtx } from "@/core/auth/session";
import { listAssets } from "@/core/services/assets";
import { listLocations } from "@/core/services/locations";
import { todayIn } from "@/core/domain/dates";
import { PageHeader } from "@/components/ui/page";
import { TaskForm } from "../task-form";

export const metadata = { title: "Schedule maintenance" };

export default async function NewTaskPage({ searchParams }: { searchParams: Promise<{ assetId?: string; title?: string; recurrence?: string; guide?: string; locationId?: string }> }) {
  const sp = await searchParams;
  const ctx = await requirePropertyCtx();
  const [assets, locations] = await Promise.all([listAssets(ctx), listLocations(ctx)]);
  return (
    <>
      <PageHeader back={{ href: "/maintenance", label: "Maintenance" }} title="Schedule maintenance" description="Set it once. Completing it records history and lines up the next one." />
      <TaskForm
        assets={assets.map((a) => ({ id: a.id, name: a.name }))}
        locations={locations.map((l) => ({ id: l.id, name: l.name }))}
        today={todayIn(ctx.timezone)}
        task={{ assetId: sp.assetId, locationId: sp.locationId, title: sp.title, recurrenceValue: sp.recurrence, guideSlug: sp.guide }}
        cancelHref={sp.assetId ? `/inventory/${sp.assetId}` : "/maintenance"}
      />
    </>
  );
}
