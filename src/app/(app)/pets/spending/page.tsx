import Link from "next/link";
import { requirePropertyCtx } from "@/core/auth/session";
import { getPetSpending } from "@/core/services/pet-spending";
import { formatDate, todayIn } from "@/core/domain/dates";
import { formatCents } from "@/core/domain/money";
import { PET_EXPENSE_CATEGORY_LABELS, type PetExpenseCategory } from "@/core/domain/validation";
import { Card, PageHeader, Section } from "@/components/ui/page";
import { PetAvatar } from "@/components/pets/pet-avatar";
import { cn } from "@/lib/cn";
import { CategoryBars } from "../spending-parts";

export const metadata = { title: "Pet spending" };

export default async function PetSpendingPage({ searchParams }: { searchParams: Promise<{ year?: string }> }) {
  const ctx = await requirePropertyCtx();
  const thisYear = Number(todayIn(ctx.timezone).slice(0, 4));
  const asked = Number((await searchParams).year);
  const year = Number.isInteger(asked) && asked > 1900 && asked <= thisYear ? asked : thisYear;
  const s = await getPetSpending(ctx, { year });
  const isThisYear = year === thisYear;

  return (
    <>
      <PageHeader back={{ href: "/pets", label: "Pets" }} title="Pet spending" description="Vet care, food, supplies and everything else, from the expenses you record. Also counted in the household's Spending page." />
      {s.years.length > 1 && (
        <nav aria-label="Year" className="flex flex-wrap gap-2 mb-6">
          {s.years.map((y) => (
            <Link key={y} href={y === thisYear ? "/pets/spending" : `/pets/spending?year=${y}`} aria-current={y === year ? "page" : undefined} className={cn("h-9 px-3.5 rounded-full text-sm font-semibold inline-flex items-center border", y === year ? "bg-brand text-brand-ink border-brand" : "bg-surface border-line-strong text-ink-2 hover:bg-surface-2")}>
              {y}
            </Link>
          ))}
        </nav>
      )}

      {!s.hasAny ? (
        <Card className="p-5 text-[15px] text-ink-2">Nothing recorded yet. Add expenses from a pet&apos;s Expenses tab, or include a cost when you log a vet visit.</Card>
      ) : (
        <div className="flex flex-col gap-7">
          <Card className={cn("p-4 sm:p-5 grid gap-4", isThisYear ? "grid-cols-2" : "grid-cols-1")}>
            {isThisYear && (
              <div>
                <div className="eyebrow">This month</div>
                <div className="figure text-[30px] mt-2">{formatCents(s.month, { compact: true })}</div>
              </div>
            )}
            <div>
              <div className="eyebrow">{isThisYear ? `${year} so far` : `${year} total`}</div>
              <div className="figure text-[30px] mt-2">{formatCents(s.yearToDate, { compact: true })}</div>
            </div>
          </Card>

          {s.byPet.length > 1 && (
            <Section title="By pet">
              <Card className="divide-y divide-line overflow-hidden">
                {s.byPet.map((p) => (
                  <Link key={p.id} href={`/pets/${p.id}/expenses`} className="flex items-center gap-3 px-4 py-3 min-h-14 hover:bg-surface-2/60">
                    <PetAvatar name={p.name} photoFileId={p.photoFileId} size="sm" />
                    <span className="flex-1 font-medium text-[15px]">{p.name}</span>
                    <span className="tabular-nums font-semibold">{formatCents(p.cents, { compact: true })}</span>
                  </Link>
                ))}
              </Card>
            </Section>
          )}

          {s.byCategory.length > 0 && (
            <Section title="By category">
              <CategoryBars rows={s.byCategory} />
            </Section>
          )}

          <Section title="Recent expenses" description="The latest 40 across every pet and year.">
            <Card className="divide-y divide-line overflow-hidden">
              {s.lines.map((e) => (
                <Link key={e.id} href={e.pet ? `/pets/${e.pet.id}/expenses/${e.id}` : "/pets"} className="flex items-center gap-3 px-4 py-3 min-h-14 hover:bg-surface-2/60">
                  <div className="min-w-0 flex-1">
                    <div className="font-medium text-[15px] leading-snug truncate">{e.title}</div>
                    <div className="text-sm text-ink-2 truncate mt-0.5">{[formatDate(e.spentOn), e.pet?.name, PET_EXPENSE_CATEGORY_LABELS[(e.category ?? "other") as PetExpenseCategory] ?? "Other"].filter(Boolean).join(" · ")}</div>
                  </div>
                  <div className="shrink-0 font-semibold tabular-nums">{formatCents(e.amountCents)}</div>
                </Link>
              ))}
            </Card>
          </Section>
        </div>
      )}
    </>
  );
}
