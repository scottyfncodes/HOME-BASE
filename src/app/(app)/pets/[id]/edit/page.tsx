import { env } from "@/core/env";
import { PetPageHeader } from "@/components/pets/pet-page-header";
import { PetForm } from "../../pet-form";
import { loadPet } from "../../load";

export const metadata = { title: "Edit pet" };

export default async function EditPetPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { pet } = await loadPet(id);
  return (
    <>
      <PetPageHeader pet={pet} back={{ href: `/pets/${id}`, label: pet.name }} title="Edit profile" />
      <PetForm pet={{ ...pet, photo: pet.photo ?? null }} cancelHref={`/pets/${id}`} maxUploadMb={Math.round(env.maxUploadBytes / 1024 / 1024)} />
    </>
  );
}
