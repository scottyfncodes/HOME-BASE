import { requirePropertyCtx } from "@/core/auth/session";
import { getProject } from "@/core/services/projects";
import { listAssets } from "@/core/services/assets";
import { listProviders } from "@/core/services/providers";
import { todayIn } from "@/core/domain/dates";
import { orNotFound } from "@/lib/not-found";
import { PageHeader } from "@/components/ui/page";
import { ExpenseForm } from "./expense-form";

export const metadata = { title: "Add expense" };

export default async function NewExpensePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const ctx = await requirePropertyCtx();
  const [project, assets, providers] = await Promise.all([orNotFound(getProject(ctx, id)), listAssets(ctx, { status: "all" }), listProviders(ctx)]);
  return (
    <>
      <PageHeader back={{ href: `/projects/${id}`, label: project.name }} title="Add an expense" />
      <ExpenseForm projectId={id} today={todayIn(ctx.timezone)} assets={assets.map((a) => ({ id: a.id, name: a.name }))} providers={providers.map((p) => ({ id: p.id, name: p.name }))} />
    </>
  );
}
