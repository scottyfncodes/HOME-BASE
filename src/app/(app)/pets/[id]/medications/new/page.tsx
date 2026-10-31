import { listProviders } from "@/core/services/providers";
import { todayIn } from "@/core/domain/dates";
import { PetPageHeader } from "@/components/pets/pet-page-header";
import { MedicationForm } from "../../../record-forms";
import { loadPet } from "../../../load";

export const metadata = { title: "Add medication" };

export default async function NewMedicationPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { ctx, pet } = await loadPet(id);
  const providers = await listProviders(ctx);
  return (
    <>
      <PetPageHeader pet={pet} back={{ href: `/pets/${id}/health`, label: "Health" }} title="Add medication" />
      <MedicationForm petId={id} providers={providers.map((p) => ({ id: p.id, name: p.name }))} cancelHref={`/pets/${id}/health`} today={todayIn(ctx.timezone)} />
    </>
  );
}
