import { getCareRoutine } from "@/core/services/pet-care";
import { listMedications } from "@/core/services/pet-health";
import { todayIn } from "@/core/domain/dates";
import { orNotFound } from "@/lib/not-found";
import { ConfirmForm } from "@/components/ui/confirm-form";
import { PetPageHeader } from "@/components/pets/pet-page-header";
import { deleteCareRoutineAction } from "../../../actions";
import { CareRoutineForm } from "../../../record-forms";
import { loadPet } from "../../../load";

export const metadata = { title: "Routine" };

export default async function CareRoutinePage({ params }: { params: Promise<{ id: string; taskId: string }> }) {
  const { id, taskId } = await params;
  const { ctx, pet } = await loadPet(id);
  const [r, meds] = await Promise.all([orNotFound(getCareRoutine(ctx, id, taskId)), listMedications(ctx, id)]);
  return (
    <>
      <PetPageHeader pet={pet} back={{ href: `/pets/${id}/care`, label: "Care" }} title={r.title} />
      <div className="flex flex-col gap-6">
        <CareRoutineForm
          petId={id}
          routine={{ id: r.id, title: r.title, careKind: r.careKind, dueOn: r.dueOn, recurrence: r.recurrence, description: r.description, medicationId: r.petMedicationId }}
          medications={meds.filter((m) => m.active || m.id === r.petMedicationId).map((m) => ({ id: m.id, name: m.name }))}
          cancelHref={`/pets/${id}/care`}
          today={todayIn(ctx.timezone)}
        />
        <div className="pt-4 border-t border-line">
          <ConfirmForm action={deleteCareRoutineAction} hidden={{ petId: id, id: taskId }} confirm={`Delete the "${r.title}" routine? Past completions stay in ${pet.name}'s history.`} variant="danger" size="sm">
            Delete routine
          </ConfirmForm>
        </div>
      </div>
    </>
  );
}
