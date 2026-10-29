import { requirePropertyCtx } from "@/core/auth/session";
import { listLocations } from "@/core/services/locations";
import { PageHeader } from "@/components/ui/page";
import { env } from "@/core/env";
import { AssetForm } from "../asset-form";

export const metadata = { title: "Add item" };

export default async function NewAssetPage({ searchParams }: { searchParams: Promise<{ locationId?: string; category?: string }> }) {
  const sp = await searchParams;
  const ctx = await requirePropertyCtx();
  const locations = await listLocations(ctx);
  return (
    <>
      <PageHeader back={{ href: "/inventory", label: "Inventory" }} title="Add an item" description="An appliance, a home system, or any equipment worth tracking." />
      <AssetForm locations={locations} asset={{ locationId: sp.locationId, category: sp.category }} cancelHref="/inventory" maxUploadMb={Math.round(env.maxUploadBytes / 1024 / 1024)} />
    </>
  );
}
