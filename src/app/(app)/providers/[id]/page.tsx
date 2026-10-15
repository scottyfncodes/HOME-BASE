import { requireCtx } from "@/core/auth/session";
import { getProvider } from "@/core/services/providers";
import { orNotFound } from "@/lib/not-found";
import { PageHeader } from "@/components/ui/page";
import { ProviderForm } from "../provider-form";

export const metadata = { title: "Service provider" };

export default async function ProviderPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const ctx = await requireCtx();
  const provider = await orNotFound(getProvider(ctx, id));
  return (
    <>
      <PageHeader back={{ href: "/providers", label: "Providers" }} title={provider.name} description={provider.trade} />
      <ProviderForm provider={provider} />
    </>
  );
}
