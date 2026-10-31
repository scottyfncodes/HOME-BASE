import { getPetExpense } from "@/core/services/pet-spending";
import { listProviders } from "@/core/services/providers";
import { todayIn } from "@/core/domain/dates";
import { orNotFound } from "@/lib/not-found";
import { ConfirmForm } from "@/components/ui/confirm-form";
import { PetPageHeader } from "@/components/pets/pet-page-header";
import { deleteExpenseAction } from "../../../actions";
import { PetExpenseForm } from "../../../record-forms";
import { loadPet } from "../../../load";

export const metadata = { title: "Expense" };

export default async function PetExpensePage({ params }: { params: Promise<{ id: string; eid: string }> }) {
  const { id, eid } = await params;
  const { ctx, pet } = await loadPet(id);
  const [e, providers] = await Promise.all([orNotFound(getPetExpense(ctx, id, eid)), listProviders(ctx)]);
  return (
    <>
      <PetPageHeader pet={pet} back={{ href: `/pets/${id}/expenses`, label: "Expenses" }} title={e.title} />
      <div className="flex flex-col gap-6">
        <PetExpenseForm petId={id} expense={e} providers={providers.map((p) => ({ id: p.id, name: p.name }))} cancelHref={`/pets/${id}/expenses`} today={todayIn(ctx.timezone)} />
        <div className="pt-4 border-t border-line">
          <ConfirmForm action={deleteExpenseAction} hidden={{ petId: id, id: eid }} confirm={`Delete "${e.title}"?`} variant="danger" size="sm">
            Delete expense
          </ConfirmForm>
        </div>
      </div>
    </>
  );
}
