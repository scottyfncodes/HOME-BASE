import { requireVaultCtx } from "@/core/auth/session";
import { env } from "@/core/env";
import { PageHeader } from "@/components/ui/page";
import { VaultDocumentForm } from "../vault-form";

export const metadata = { title: "Add to Vault" };

export default async function NewVaultDocumentPage() {
  await requireVaultCtx("/vault/new");
  return (
    <>
      <PageHeader back={{ href: "/vault", label: "Vault" }} title="Add to the Vault" />
      <VaultDocumentForm maxMb={Math.round(env.maxUploadBytes / 1024 / 1024)} />
    </>
  );
}
