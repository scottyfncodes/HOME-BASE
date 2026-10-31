import { listProviders } from "@/core/services/providers";
import { todayIn } from "@/core/domain/dates";
import { env } from "@/core/env";
import { PET_HEALTH_KINDS } from "@/core/domain/validation";
import { PetPageHeader } from "@/components/pets/pet-page-header";
import { HealthEventForm } from "../../../record-forms";
import { loadPet } from "../../../load";

export const metadata = { title: "Add a health record" };

export default async function NewHealthEventPage({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<{ kind?: string }> }) {
  const { id } = await params;
  const { kind } = await searchParams;
  const { ctx, pet } = await loadPet(id);
  const providers = await listProviders(ctx);
  const k = (PET_HEALTH_KINDS as readonly string[]).includes(kind ?? "") ? kind : "vet_visit";
  return (
    <>
      <PetPageHeader pet={pet} back={{ href: `/pets/${id}/health`, label: "Health" }} title={k === "weight" ? "Record weight" : k === "vet_visit" ? "Log a vet visit" : "Add a health record"} />
      <HealthEventForm petId={id} petName={pet.name} event={{ kind: k }} providers={providers.map((p) => ({ id: p.id, name: p.name }))} weightUnit={pet.weightUnit} cancelHref={`/pets/${id}/health`} today={todayIn(ctx.timezone)} maxMb={Math.round(env.maxUploadBytes / 1024 / 1024)} />
    </>
  );
}
