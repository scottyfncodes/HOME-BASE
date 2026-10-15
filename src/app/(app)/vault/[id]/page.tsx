import { Download, FileText, Pencil } from "lucide-react";
import { requireVaultCtx } from "@/core/auth/session";
import { getDocument } from "@/core/services/documents";
import { audit } from "@/core/services/vault";
import { orNotFound } from "@/lib/not-found";
import { VAULT_CATEGORY_LABELS } from "@/core/domain/validation";
import { formatDate } from "@/core/domain/dates";
import { canInline, formatBytes, isImageType } from "@/core/storage/types";
import { ButtonLink } from "@/components/ui/button";
import { Card, DescriptionList, PageHeader } from "@/components/ui/page";
import { ConfirmForm } from "@/components/ui/confirm-form";
import { deleteVaultDocumentAction } from "../actions";

export default async function VaultDocumentPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const ctx = await requireVaultCtx(`/vault/${id}`);
  const doc = await orNotFound(getDocument(ctx, id));
  if (!doc.isVault) return null;
  await audit(ctx, "document_view", id);
  const file = doc.file;
  const href = file ? `/api/files/${file.id}` : null;
  const previewable = file && canInline(file.contentType) && !file.contentType.includes("heic") && !file.contentType.includes("heif");
  return (
    <>
      <PageHeader back={{ href: "/vault", label: "Vault" }} eyebrow={VAULT_CATEGORY_LABELS[doc.category as keyof typeof VAULT_CATEGORY_LABELS] ?? doc.category} title={doc.title} actions={<ButtonLink href={`/vault/${id}/edit`} variant="secondary" size="sm"><Pencil className="size-4" aria-hidden /> Edit</ButtonLink>} />
      <div className="flex flex-col gap-5">
        {file && href ? (
          <Card className="overflow-hidden">
            {previewable ? (
              isImageType(file.contentType) ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={href} alt={doc.title} className="w-full max-h-[70vh] object-contain bg-surface-2" />
              ) : (
                <iframe src={href} title={doc.title} className="w-full h-[60vh] bg-surface-2" />
              )
            ) : (
              <div className="p-6 flex items-center gap-3">
                <FileText className="size-8 text-accent" aria-hidden />
                <div>
                  <div className="font-medium">{file.filename}</div>
                  <div className="text-sm text-ink-2">Download to open this file type.</div>
                </div>
              </div>
            )}
            <div className="flex flex-wrap items-center justify-between gap-2 px-4 py-3 border-t border-line text-sm">
              <span className="text-ink-2 truncate">{file.filename} · {formatBytes(file.sizeBytes)} · encrypted</span>
              <a href={`${href}?download=1`} className="inline-flex items-center gap-1 font-semibold text-brand"><Download className="size-4" aria-hidden /> Download</a>
            </div>
          </Card>
        ) : (
          <div className="rounded-xl bg-warn-soft text-warn px-4 py-3 text-sm">No file attached. This entry is a record only.</div>
        )}
        <Card className="p-4 sm:p-5">
          <DescriptionList
            items={[
              doc.documentDate && { label: "Document date", value: formatDate(doc.documentDate) },
              doc.expiresOn && { label: "Expires", value: formatDate(doc.expiresOn) },
              { label: "Added", value: formatDate(doc.createdAt.toISOString().slice(0, 10)) },
              doc.notes && { label: "Notes", value: <span className="whitespace-pre-wrap">{doc.notes}</span> },
            ]}
          />
        </Card>
        <div className="pt-4 border-t border-line">
          <ConfirmForm action={deleteVaultDocumentAction} hidden={{ id }} confirm={`Permanently delete "${doc.title}" from the Vault? This cannot be undone.`} variant="danger" size="sm">
            Delete from Vault
          </ConfirmForm>
        </div>
      </div>
    </>
  );
}
