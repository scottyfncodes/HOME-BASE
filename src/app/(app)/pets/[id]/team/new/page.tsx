import { listPetProviders } from "@/core/services/pets";
import { listProviders } from "@/core/services/providers";
import { PET_PROVIDER_ROLES } from "@/core/domain/validation";
import { possessive } from "@/core/domain/pets";
import { PetPageHeader } from "@/components/pets/pet-page-header";
import { LinkProviderForm } from "../../../record-forms";
import { loadPet } from "../../../load";

export const metadata = { title: "Add to care team" };

export default async function NewTeamMemberPage({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<{ role?: string }> }) {
  const { id } = await params;
  const { role } = await searchParams;
  const { ctx, pet } = await loadPet(id);
  const [providers, team] = await Promise.all([listProviders(ctx), listPetProviders(ctx, id)]);
  const linked = new Set(team.map((t) => t.provider.id));
  const hasPrimary = team.some((t) => t.role === "primary_vet");
  return (
    <>
      <PetPageHeader pet={pet} back={{ href: `/pets/${id}`, label: pet.name }} title={`${possessive(pet.name)} care team`} description="Veterinarians, the emergency clinic, groomers, sitters." />
      <LinkProviderForm
        petId={id}
        providers={providers.filter((p) => !linked.has(p.id)).map((p) => ({ id: p.id, name: p.name }))}
        cancelHref={`/pets/${id}`}
        defaultRole={(PET_PROVIDER_ROLES as readonly string[]).includes(role ?? "") ? role : hasPrimary ? "emergency_vet" : "primary_vet"}
      />
    </>
  );
}
