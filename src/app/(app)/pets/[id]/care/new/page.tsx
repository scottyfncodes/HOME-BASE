import { listMedications } from "@/core/services/pet-health";
import { todayIn } from "@/core/domain/dates";
import { PET_CARE_KINDS } from "@/core/domain/validation";
import { PetPageHeader } from "@/components/pets/pet-page-header";
import { CareRoutineForm } from "../../../record-forms";
import { loadPet } from "../../../load";

export const metadata = { title: "Add a routine" };

export default async function NewCarePage({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<{ title?: string; kind?: string; recurrence?: string; medicationId?: string }> }) {
  const { id } = await params;
  const sp = await searchParams;
  const { ctx, pet } = await loadPet(id);
  const meds = (await listMedications(ctx, id)).filter((m) => m.active);
  const kind = (PET_CARE_KINDS as readonly string[]).includes(sp.kind ?? "") ? sp.kind : undefined;
  return (
    <>
      <PetPageHeader pet={pet} back={{ href: `/pets/${id}/care`, label: "Care" }} title="Add a routine" />
      <CareRoutineForm
        petId={id}
        routine={{ title: sp.title?.slice(0, 120), careKind: kind ?? null, recurrenceValue: sp.recurrence && /^\d{1,3}-(day|week|month|year)$/.test(sp.recurrence) ? sp.recurrence : undefined, medicationId: sp.medicationId }}
        medications={meds.map((m) => ({ id: m.id, name: m.name }))}
        cancelHref={`/pets/${id}/care`}
        today={todayIn(ctx.timezone)}
      />
    </>
  );
}
