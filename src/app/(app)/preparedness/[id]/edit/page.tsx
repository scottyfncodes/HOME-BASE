import { requirePropertyCtx } from "@/core/auth/session";
import { getPreparedness } from "@/core/services/preparedness";
import { listLocations } from "@/core/services/locations";
import { listPets } from "@/core/services/pets";
import { orNotFound } from "@/lib/not-found";
import { PageHeader } from "@/components/ui/page";
import { PreparednessForm } from "../../preparedness-form";

export const metadata = { title: "Edit record" };

export default async function EditPreparednessPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const ctx = await requirePropertyCtx();
  const [item, locations, pets] = await Promise.all([orNotFound(getPreparedness(ctx, id)), listLocations(ctx), listPets(ctx)]);
  return (
    <>
      <PageHeader back={{ href: `/preparedness/${id}`, label: item.title }} title="Edit record" />
      <PreparednessForm item={item} locations={locations} pets={pets.map((p) => ({ id: p.id, name: p.name }))} cancelHref={`/preparedness/${id}`} />
    </>
  );
}
