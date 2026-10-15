import { requirePropertyCtx } from "@/core/auth/session";
import { getPreparedness } from "@/core/services/preparedness";
import { listLocations } from "@/core/services/locations";
import { orNotFound } from "@/lib/not-found";
import { PageHeader } from "@/components/ui/page";
import { PreparednessForm } from "../../preparedness-form";

export const metadata = { title: "Edit record" };

export default async function EditPreparednessPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const ctx = await requirePropertyCtx();
  const [item, locations] = await Promise.all([orNotFound(getPreparedness(ctx, id)), listLocations(ctx)]);
  return (
    <>
      <PageHeader back={{ href: `/preparedness/${id}`, label: item.title }} title="Edit record" />
      <PreparednessForm item={item} locations={locations} cancelHref={`/preparedness/${id}`} />
    </>
  );
}
