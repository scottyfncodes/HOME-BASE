import { Pencil } from "lucide-react";
import Link from "next/link";
import { ChevronLeft } from "lucide-react";
import { todayIn } from "@/core/domain/dates";
import { describeAge, speciesLabel } from "@/core/domain/pets";
import { PET_SEX_LABELS } from "@/core/domain/validation";
import { ButtonLink } from "@/components/ui/button";
import { Pill } from "@/components/ui/page";
import { PetAvatar } from "@/components/pets/pet-avatar";
import { PetTabs } from "@/components/pets/pet-tabs";
import { loadPet } from "../../load";

/**
 * The pet's dossier header: their face, the facts that identify them, and
 * the five sections of their profile.
 */
export default async function PetProfileLayout({ children, params }: { children: React.ReactNode; params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { ctx, pet } = await loadPet(id);
  const today = todayIn(ctx.timezone);
  const age = describeAge(pet.birthDate, today, pet.birthDateEstimated);
  const facts = [speciesLabel(pet.species, pet.speciesDetail), pet.breed, age, pet.sex && pet.sex !== "unknown" ? PET_SEX_LABELS[pet.sex] : null].filter(Boolean);

  return (
    <>
      <Link href="/pets" className="inline-flex items-center gap-1 h-6 text-sm font-semibold text-brand -ml-1 w-fit mb-4">
        <ChevronLeft className="size-4" aria-hidden /> Pets
      </Link>
      <header className="flex items-center gap-4 sm:gap-6 mb-5">
        <PetAvatar name={pet.name} photoFileId={pet.photoFileId} size="xl" className="ring-4 ring-surface shadow-[var(--shadow)]" />
        <div className="min-w-0 flex-1">
          {pet.archivedAt && (
            <div className="mb-1.5">
              <Pill tone="warn">{pet.archivedReason ? `Archived · ${pet.archivedReason}` : "Archived"}</Pill>
            </div>
          )}
          <h1 className="font-display text-[34px] sm:text-[42px] leading-[1.05] font-semibold tracking-tight break-words">{pet.name}</h1>
          <p className="text-ink-2 text-[15px] mt-1.5 leading-snug">{facts.join(" · ")}</p>
        </div>
        <ButtonLink href={`/pets/${id}/edit`} variant="secondary" size="sm" className="shrink-0 self-start hidden sm:inline-flex">
          <Pencil className="size-4" aria-hidden /> Edit
        </ButtonLink>
      </header>
      <div className="mb-6">
        <PetTabs petId={id} />
      </div>
      {children}
    </>
  );
}
