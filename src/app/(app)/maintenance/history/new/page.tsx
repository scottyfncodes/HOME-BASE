import { requirePropertyCtx } from "@/core/auth/session";
import { listAssets } from "@/core/services/assets";
import { listLocations } from "@/core/services/locations";
import { listProviders } from "@/core/services/providers";
import { todayIn } from "@/core/domain/dates";
import { PageHeader } from "@/components/ui/page";
import { LogForm } from "./log-form";

export const metadata = { title: "Log work" };

export default async function NewLogPage({ searchParams }: { searchParams: Promise<{ assetId?: string }> }) {
  const sp = await searchParams;
  const ctx = await requirePropertyCtx();
  const [assets, locations, providers] = await Promise.all([listAssets(ctx, { status: "all" }), listLocations(ctx), listProviders(ctx)]);
  return (
    <>
      <PageHeader back={{ href: sp.assetId ? `/inventory/${sp.assetId}` : "/maintenance?view=history", label: "Back" }} title="Log past work" description="Work that already happened: a service call, a repair, something you did last weekend." />
      <LogForm
        today={todayIn(ctx.timezone)}
        assetId={sp.assetId}
        assets={assets.map((a) => ({ id: a.id, name: a.name }))}
        locations={locations.map((l) => ({ id: l.id, name: l.name }))}
        providers={providers.map((p) => ({ id: p.id, name: p.name }))}
      />
    </>
  );
}
