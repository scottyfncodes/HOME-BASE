import Link from "next/link";
import { getPetSpending, listPetExpenses } from "@/core/services/pet-spending";
import { formatDate } from "@/core/domain/dates";
import { formatCents } from "@/core/domain/money";
import { possessive } from "@/core/domain/pets";
import { PET_EXPENSE_CATEGORY_LABELS, type PetExpenseCategory } from "@/core/domain/validation";
import { ButtonLink } from "@/components/ui/button";
import { Card, Section } from "@/components/ui/page";
import { CategoryBars } from "../../../spending-parts";
import { loadPet } from "../../../load";

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }) {
  const { pet } = await loadPet((await params).id);
  return { title: `${pet.name} · Expenses` };
}

export default async function PetExpensesPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { ctx, pet } = await loadPet(id);
  const [summary, expenses] = await Promise.all([getPetSpending(ctx, { petId: id }), listPetExpenses(ctx, id)]);

  return (
    <div className="flex flex-col gap-7">
      <div className="flex flex-wrap gap-2">
        <ButtonLink href={`/pets/${id}/expenses/new`} size="sm">Add an expense</ButtonLink>
        <ButtonLink href="/pets/spending" size="sm" variant="secondary">All pets</ButtonLink>
      </div>

      {expenses.length === 0 ? (
        <Card className="p-4 sm:p-5 text-[15px] text-ink-2">
          Nothing recorded for {pet.name} yet. Food, supplies, grooming and boarding go here; vet visit costs are added automatically when you log a visit with a cost.
        </Card>
      ) : (
        <>
          <Card className="p-4 sm:p-5 grid grid-cols-2 gap-4">
            <div>
              <div className="eyebrow">This month</div>
              <div className="figure text-[28px] mt-2">{formatCents(summary.month, { compact: true })}</div>
            </div>
            <div>
              <div className="eyebrow">{summary.year} so far</div>
              <div className="figure text-[28px] mt-2">{formatCents(summary.yearToDate, { compact: true })}</div>
            </div>
          </Card>
          {summary.byCategory.length > 0 && (
            <Section title={`Where ${possessive(pet.name)} money went in ${summary.year}`}>
              <CategoryBars rows={summary.byCategory} />
            </Section>
          )}
          <Section title="Every expense">
            <Card className="divide-y divide-line overflow-hidden">
              {expenses.map((e) => (
                <Link key={e.id} href={`/pets/${id}/expenses/${e.id}`} className="flex items-center gap-3 px-4 py-3 min-h-14 hover:bg-surface-2/60">
                  <div className="min-w-0 flex-1">
                    <div className="font-medium text-[15px] leading-snug truncate">{e.title}</div>
                    <div className="text-sm text-ink-2 truncate mt-0.5">{[formatDate(e.spentOn), PET_EXPENSE_CATEGORY_LABELS[(e.category ?? "other") as PetExpenseCategory] ?? "Other", e.provider?.name].filter(Boolean).join(" · ")}</div>
                  </div>
                  <div className="shrink-0 font-semibold tabular-nums">{formatCents(e.amountCents)}</div>
                </Link>
              ))}
            </Card>
          </Section>
        </>
      )}
    </div>
  );
}
