import { listProviders } from "@/core/services/providers";
import { listPetProviders } from "@/core/services/pets";
import { todayIn } from "@/core/domain/dates";
import { env } from "@/core/env";
import { PetPageHeader } from "@/components/pets/pet-page-header";
import { VaccinationForm } from "../../../record-forms";
import { loadPet } from "../../../load";

export const metadata = { title: "Record a vaccination" };

export default async function NewVaccinationPage({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<{ name?: string }> }) {
  const { id } = await params;
  const { name } = await searchParams;
  const { ctx, pet } = await loadPet(id);
  const [providers, team] = await Promise.all([listProviders(ctx), listPetProviders(ctx, id)]);
  const primary = team.find((t) => t.role === "primary_vet")?.provider.id;
  return (
    <>
      <PetPageHeader pet={pet} back={{ href: `/pets/${id}/health`, label: "Health" }} title="Record a vaccination" />
      <VaccinationForm petId={id} species={pet.species} vaccination={{ name: name?.slice(0, 100), providerId: primary }} providers={providers.map((p) => ({ id: p.id, name: p.name }))} cancelHref={`/pets/${id}/health`} today={todayIn(ctx.timezone)} maxMb={Math.round(env.maxUploadBytes / 1024 / 1024)} />
    </>
  );
}
