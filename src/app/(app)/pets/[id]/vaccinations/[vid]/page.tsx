import Link from "next/link";
import { getVaccination } from "@/core/services/pet-health";
import { listProviders } from "@/core/services/providers";
import { todayIn } from "@/core/domain/dates";
import { env } from "@/core/env";
import { orNotFound } from "@/lib/not-found";
import { ConfirmForm } from "@/components/ui/confirm-form";
import { ButtonLink } from "@/components/ui/button";
import { PetPageHeader } from "@/components/pets/pet-page-header";
import { deleteVaccinationAction } from "../../../actions";
import { VaccinationForm } from "../../../record-forms";
import { loadPet } from "../../../load";

export const metadata = { title: "Vaccination" };

export default async function VaccinationPage({ params }: { params: Promise<{ id: string; vid: string }> }) {
  const { id, vid } = await params;
  const { ctx, pet } = await loadPet(id);
  const [v, providers] = await Promise.all([orNotFound(getVaccination(ctx, id, vid)), listProviders(ctx)]);
  return (
    <>
      <PetPageHeader pet={pet} back={{ href: `/pets/${id}/health`, label: "Health" }} title={v.name} />
      <div className="flex flex-col gap-6">
        <div className="flex flex-wrap gap-2">
          <ButtonLink href={`/pets/${id}/vaccinations/new?name=${encodeURIComponent(v.name)}`} size="sm">Record the next dose</ButtonLink>
          {v.document && (
            <Link href={`/documents/${v.document.id}`} className="inline-flex items-center h-9 px-3 text-sm font-semibold text-brand">
              Open the certificate
            </Link>
          )}
        </div>
        <VaccinationForm petId={id} species={pet.species} vaccination={v} providers={providers.map((p) => ({ id: p.id, name: p.name }))} cancelHref={`/pets/${id}/health`} today={todayIn(ctx.timezone)} maxMb={Math.round(env.maxUploadBytes / 1024 / 1024)} />
        <div className="pt-4 border-t border-line">
          <ConfirmForm action={deleteVaccinationAction} hidden={{ petId: id, id: vid }} confirm={`Delete this ${v.name} record? A certificate stays under ${pet.name}'s documents.`} variant="danger" size="sm">
            Delete vaccination
          </ConfirmForm>
        </div>
      </div>
    </>
  );
}
