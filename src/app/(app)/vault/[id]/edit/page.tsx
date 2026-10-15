import { requireVaultCtx } from "@/core/auth/session";
import { getDocument } from "@/core/services/documents";
import { env } from "@/core/env";
import { orNotFound } from "@/lib/not-found";
import { PageHeader } from "@/components/ui/page";
import { VaultDocumentForm } from "../../vault-form";

export const metadata = { title: "Edit Vault document" };

export default async function EditVaultDocumentPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const ctx = await requireVaultCtx(`/vault/${id}/edit`);
  const doc = await orNotFound(getDocument(ctx, id));
  return (
    <>
      <PageHeader back={{ href: `/vault/${id}`, label: doc.title }} title="Edit Vault document" description="To replace the file, delete this entry and add it again." />
      <VaultDocumentForm doc={doc} maxMb={Math.round(env.maxUploadBytes / 1024 / 1024)} />
    </>
  );
}
