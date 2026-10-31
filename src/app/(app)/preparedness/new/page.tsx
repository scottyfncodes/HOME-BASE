import { requirePropertyCtx } from "@/core/auth/session";
import { listLocations } from "@/core/services/locations";
import { listPets } from "@/core/services/pets";
import { PREPAREDNESS_KINDS } from "@/core/domain/validation";
import { PageHeader } from "@/components/ui/page";
import { PreparednessForm } from "../preparedness-form";

export const metadata = { title: "Add preparedness record" };

export default async function NewPreparednessPage({ searchParams }: { searchParams: Promise<{ kind?: string; title?: string; petId?: string }> }) {
  const { kind, title, petId } = await searchParams;
  const ctx = await requirePropertyCtx();
  const [locations, pets] = await Promise.all([listLocations(ctx), listPets(ctx)]);
  return (
    <>
      <PageHeader back={{ href: "/preparedness", label: "Preparedness" }} title="Add a record" description="Write it the way you would explain it to a house sitter." />
      <PreparednessForm
        item={{ kind: (PREPAREDNESS_KINDS as readonly string[]).includes(kind ?? "") ? kind : undefined, title: title?.slice(0, 120), petId: pets.some((p) => p.id === petId) ? petId : undefined }}
        locations={locations}
        pets={pets.map((p) => ({ id: p.id, name: p.name }))}
        cancelHref="/preparedness"
      />
    </>
  );
}
