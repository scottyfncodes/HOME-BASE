import { requirePropertyCtx } from "@/core/auth/session";
import { getAsset } from "@/core/services/assets";
import { listLocations } from "@/core/services/locations";
import { orNotFound } from "@/lib/not-found";
import { PageHeader } from "@/components/ui/page";
import { AssetForm } from "../../asset-form";

export const metadata = { title: "Edit item" };

export default async function EditAssetPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const ctx = await requirePropertyCtx();
  const [asset, locations] = await Promise.all([orNotFound(getAsset(ctx, id)), listLocations(ctx)]);
  return (
    <>
      <PageHeader back={{ href: `/inventory/${id}`, label: asset.name }} title="Edit item" />
      <AssetForm asset={asset} locations={locations} cancelHref={`/inventory/${id}`} />
    </>
  );
}
