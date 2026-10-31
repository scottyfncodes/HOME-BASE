import { listProviders } from "@/core/services/providers";
import { todayIn } from "@/core/domain/dates";
import { PET_EXPENSE_CATEGORIES } from "@/core/domain/validation";
import { PetPageHeader } from "@/components/pets/pet-page-header";
import { PetExpenseForm } from "../../../record-forms";
import { loadPet } from "../../../load";

export const metadata = { title: "Add an expense" };

export default async function NewPetExpensePage({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<{ category?: string }> }) {
  const { id } = await params;
  const { category } = await searchParams;
  const { ctx, pet } = await loadPet(id);
  const providers = await listProviders(ctx);
  return (
    <>
      <PetPageHeader pet={pet} back={{ href: `/pets/${id}/expenses`, label: "Expenses" }} title="Add an expense" />
      <PetExpenseForm petId={id} providers={providers.map((p) => ({ id: p.id, name: p.name }))} cancelHref={`/pets/${id}/expenses`} today={todayIn(ctx.timezone)} defaultCategory={(PET_EXPENSE_CATEGORIES as readonly string[]).includes(category ?? "") ? category : undefined} />
    </>
  );
}
