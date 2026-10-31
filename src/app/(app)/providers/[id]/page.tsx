import { requireCtx } from "@/core/auth/session";
import { getProvider } from "@/core/services/providers";
import Link from "next/link";
import { petsForProvider } from "@/core/services/pets";
import { PET_PROVIDER_ROLE_LABELS } from "@/core/domain/validation";
import { orNotFound } from "@/lib/not-found";
import { Card, PageHeader, Section } from "@/components/ui/page";
import { ProviderForm } from "../provider-form";

export const metadata = { title: "Service provider" };

export default async function ProviderPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const ctx = await requireCtx();
  const provider = await orNotFound(getProvider(ctx, id));
  const pets = await petsForProvider(ctx, id);
  return (
    <>
      <PageHeader back={{ href: "/providers", label: "Providers" }} title={provider.name} description={provider.trade} />
      {pets.length > 0 && (
        <Section title="Cares for" className="mb-6">
          <Card className="divide-y divide-line overflow-hidden">
            {pets.map((p) => (
              <Link key={p.id} href={`/pets/${p.id}`} className="flex items-center justify-between gap-3 px-4 py-3 hover:bg-surface-2/60">
                <span className="font-medium text-[15px]">{p.name}{p.archivedAt ? <span className="text-ink-3 font-normal"> · archived</span> : null}</span>
                <span className="text-sm text-ink-2">{PET_PROVIDER_ROLE_LABELS[p.role]}</span>
              </Link>
            ))}
          </Card>
        </Section>
      )}
      <ProviderForm provider={provider} />
    </>
  );
}
