import { and, desc, eq, gte, inArray, isNotNull, lte, sql } from "drizzle-orm";
import { expense, pet } from "../db/schema";
import { NotFoundError } from "../errors";
import { PET_EXPENSE_CATEGORIES, type PetExpenseCategory, type PetExpenseInput } from "../domain/validation";
import { todayIn } from "../domain/dates";
import type { PropertyCtx } from "./context";
import { nullable } from "./context";
import { assertProvider } from "./providers";
import { getPet } from "./pets";

/**
 * Pet spending is ordinary Home Base `expense` rows with a `pet_id`, so the
 * household Spending page counts it too. This module adds the pet views:
 * per pet, per category, this month and year to date.
 */

export async function listPetExpenses(ctx: PropertyCtx, petId: string, opts: { limit?: number } = {}) {
  await getPet(ctx, petId);
  return ctx.db.query.expense.findMany({
    where: and(eq(expense.petId, petId), eq(expense.propertyId, ctx.propertyId)),
    with: { provider: { columns: { id: true, name: true } } },
    orderBy: [desc(expense.spentOn), desc(expense.createdAt)],
    limit: Math.min(opts.limit ?? 200, 500),
  });
}

export async function getPetExpense(ctx: PropertyCtx, petId: string, id: string) {
  await getPet(ctx, petId);
  const row = await ctx.db.query.expense.findFirst({ where: and(eq(expense.id, id), eq(expense.petId, petId), eq(expense.propertyId, ctx.propertyId)) });
  if (!row) throw new NotFoundError("Expense not found");
  return row;
}

async function toRow(ctx: PropertyCtx, input: PetExpenseInput) {
  return {
    title: input.title,
    amountCents: input.amount,
    spentOn: input.spentOn,
    category: input.category ?? "other",
    providerId: await assertProvider(ctx, input.providerId),
    notes: nullable(input.notes),
  };
}

export async function createPetExpense(ctx: PropertyCtx, petId: string, input: PetExpenseInput) {
  await getPet(ctx, petId);
  const [row] = await ctx.db.insert(expense).values({ propertyId: ctx.propertyId, petId, ...(await toRow(ctx, input)) }).returning();
  return row;
}

export async function updatePetExpense(ctx: PropertyCtx, petId: string, id: string, input: PetExpenseInput) {
  await getPetExpense(ctx, petId, id);
  const [row] = await ctx.db
    .update(expense)
    .set(await toRow(ctx, input))
    .where(and(eq(expense.id, id), eq(expense.petId, petId), eq(expense.propertyId, ctx.propertyId)))
    .returning();
  return row;
}

export async function deletePetExpense(ctx: PropertyCtx, petId: string, id: string) {
  await getPetExpense(ctx, petId, id);
  await ctx.db.delete(expense).where(and(eq(expense.id, id), eq(expense.petId, petId), eq(expense.propertyId, ctx.propertyId)));
}

export type PetSpending = Awaited<ReturnType<typeof getPetSpending>>;

/**
 * A simple overview: this month, year to date, by category and by pet, plus
 * recent history. Pass `petId` for one pet. Archived pets still count:
 * money spent on them was still spent.
 */
export async function getPetSpending(ctx: PropertyCtx, opts: { petId?: string; year?: number } = {}) {
  if (opts.petId) await getPet(ctx, opts.petId);
  const today = todayIn(ctx.timezone);
  const year = opts.year ?? Number(today.slice(0, 4));
  const monthStart = `${today.slice(0, 7)}-01`;
  const yearStart = `${year}-01-01`;
  const yearEnd = `${year}-12-31`;

  const petIds = opts.petId
    ? [opts.petId]
    : (await ctx.db.select({ id: pet.id }).from(pet).where(eq(pet.householdId, ctx.householdId))).map((r) => r.id);
  if (petIds.length === 0) {
    return { year, month: 0, yearToDate: 0, byCategory: [], byPet: [], lines: [], years: [year], hasAny: false };
  }

  const scope = and(eq(expense.propertyId, ctx.propertyId), isNotNull(expense.petId), inArray(expense.petId, petIds));
  const [yearRows, history, years] = await Promise.all([
    ctx.db.query.expense.findMany({
      where: and(scope, gte(expense.spentOn, yearStart), lte(expense.spentOn, yearEnd)),
      with: { pet: { columns: { id: true, name: true, photoFileId: true } } },
      orderBy: [desc(expense.spentOn), desc(expense.createdAt)],
    }),
    ctx.db.query.expense.findMany({
      where: scope,
      with: { pet: { columns: { id: true, name: true } } },
      orderBy: [desc(expense.spentOn), desc(expense.createdAt)],
      limit: 40,
    }),
    ctx.db.selectDistinct({ y: sql<number>`extract(year from ${expense.spentOn})::int` }).from(expense).where(scope),
  ]);

  let month = 0;
  let yearToDate = 0;
  const byCategory = new Map<PetExpenseCategory, number>();
  const byPet = new Map<string, { id: string; name: string; photoFileId: string | null; cents: number }>();
  for (const e of yearRows) {
    if (e.spentOn > today && year === Number(today.slice(0, 4))) continue;
    yearToDate += e.amountCents;
    if (e.spentOn >= monthStart && e.spentOn <= today) month += e.amountCents;
    const cat = (PET_EXPENSE_CATEGORIES as readonly string[]).includes(e.category ?? "") ? (e.category as PetExpenseCategory) : "other";
    byCategory.set(cat, (byCategory.get(cat) ?? 0) + e.amountCents);
    if (e.pet) {
      const cur = byPet.get(e.pet.id) ?? { id: e.pet.id, name: e.pet.name, photoFileId: e.pet.photoFileId, cents: 0 };
      cur.cents += e.amountCents;
      byPet.set(e.pet.id, cur);
    }
  }
  return {
    year,
    month,
    yearToDate,
    byCategory: [...byCategory.entries()].map(([category, cents]) => ({ category, cents })).sort((a, b) => b.cents - a.cents),
    byPet: [...byPet.values()].sort((a, b) => b.cents - a.cents),
    lines: history,
    years: [...new Set([year, ...years.map((r) => Number(r.y))])].sort((a, b) => b - a),
    hasAny: history.length > 0,
  };
}
