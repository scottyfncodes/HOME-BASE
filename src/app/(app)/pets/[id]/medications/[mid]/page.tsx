import { getMedication } from "@/core/services/pet-health";
import { listProviders } from "@/core/services/providers";
import { todayIn } from "@/core/domain/dates";
import { orNotFound } from "@/lib/not-found";
import { ButtonLink } from "@/components/ui/button";
import { ConfirmForm } from "@/components/ui/confirm-form";
import { PetPageHeader } from "@/components/pets/pet-page-header";
import { deleteMedicationAction, stopMedicationAction } from "../../../actions";
import { MedicationForm } from "../../../record-forms";
import { loadPet } from "../../../load";

export const metadata = { title: "Medication" };

export default async function MedicationPage({ params }: { params: Promise<{ id: string; mid: string }> }) {
  const { id, mid } = await params;
  const { ctx, pet } = await loadPet(id);
  const [m, providers] = await Promise.all([orNotFound(getMedication(ctx, id, mid)), listProviders(ctx)]);
  return (
    <>
      <PetPageHeader pet={pet} back={{ href: `/pets/${id}/health`, label: "Health" }} title={m.name} description={[m.dosage, m.frequency].filter(Boolean).join(" · ") || undefined} />
      <div className="flex flex-col gap-6">
        {m.active && (
          <div className="flex flex-wrap gap-2">
            <ButtonLink href={`/pets/${id}/care/new?kind=medication&medicationId=${m.id}&title=${encodeURIComponent(m.name)}`} size="sm">Add a reminder to give it</ButtonLink>
            <ConfirmForm action={stopMedicationAction} hidden={{ petId: id, id: mid }} confirm={`Mark ${m.name} as stopped? Its reminders end. The record stays in ${pet.name}'s history.`} variant="secondary" size="sm">
              Mark as stopped
            </ConfirmForm>
          </div>
        )}
        <MedicationForm petId={id} medication={m} providers={providers.map((p) => ({ id: p.id, name: p.name }))} cancelHref={`/pets/${id}/health`} today={todayIn(ctx.timezone)} />
        <div className="pt-4 border-t border-line">
          <ConfirmForm action={deleteMedicationAction} hidden={{ petId: id, id: mid }} confirm={`Delete ${m.name} entirely? To keep the history, mark it as stopped instead.`} variant="danger" size="sm">
            Delete medication
          </ConfirmForm>
        </div>
      </div>
    </>
  );
}
