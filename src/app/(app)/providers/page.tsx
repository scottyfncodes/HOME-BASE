import { Phone, Plus, Users } from "lucide-react";
import { requireCtx } from "@/core/auth/session";
import { listProviders } from "@/core/services/providers";
import { ButtonLink } from "@/components/ui/button";
import { Card, EmptyState, PageHeader, Row } from "@/components/ui/page";

export const metadata = { title: "Service providers" };

export default async function ProvidersPage() {
  const ctx = await requireCtx();
  const providers = await listProviders(ctx);
  return (
    <>
      <PageHeader
        title="Service providers"
        description="The people who work on your home. Attach them to completed work and expenses."
        actions={
          <ButtonLink href="/providers/new" size="sm">
            <Plus className="size-4" aria-hidden /> Add
          </ButtonLink>
        }
      />
      {providers.length === 0 ? (
        <EmptyState icon={<Users />} title="No providers yet" description="Add the plumber, electrician, HVAC company and anyone else you would call." action={<ButtonLink href="/providers/new">Add a provider</ButtonLink>} />
      ) : (
        <Card className="divide-y divide-line overflow-hidden">
          {providers.map((p) => (
            <Row
              key={p.id}
              href={`/providers/${p.id}`}
              icon={<Users />}
              title={p.name}
              subtitle={[p.trade, p.phone].filter(Boolean).join(" · ") || undefined}
              trailing={p.phone ? <a href={`tel:${p.phone.replace(/[^\d+]/g, "")}`} className="ml-1 size-10 rounded-xl bg-brand-soft text-brand flex items-center justify-center" aria-label={`Call ${p.name}`}><Phone className="size-4" aria-hidden /></a> : undefined}
            />
          ))}
        </Card>
      )}
    </>
  );
}
