import Link from "next/link";
import { Download, ExternalLink, FileText, Pencil } from "lucide-react";
import { requirePropertyCtx } from "@/core/auth/session";
import { getDocument } from "@/core/services/documents";
import { orNotFound } from "@/lib/not-found";
import { DOCUMENT_CATEGORY_LABELS } from "@/core/domain/validation";
import { formatDate, todayIn } from "@/core/domain/dates";
import { canInline, formatBytes, isImageType } from "@/core/storage/types";
import { ButtonLink } from "@/components/ui/button";
import { Card, DescriptionList, PageHeader, Pill } from "@/components/ui/page";
import { ConfirmForm } from "@/components/ui/confirm-form";
import { deleteDocumentAction } from "../actions";

export default async function DocumentPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const ctx = await requirePropertyCtx();
  const doc = await orNotFound(getDocument(ctx, id));
  const today = todayIn(ctx.timezone);
  const file = doc.file;
  const fileHref = file ? `/api/files/${file.id}` : null;
  const previewable = file && canInline(file.contentType) && file.contentType !== "image/heic" && file.contentType !== "image/heif";

  return (
    <>
      <PageHeader
        back={{ href: "/documents", label: "Documents" }}
        eyebrow={
          <span className="inline-flex items-center gap-2">
            {DOCUMENT_CATEGORY_LABELS[doc.category as keyof typeof DOCUMENT_CATEGORY_LABELS] ?? doc.category}
            {doc.expiresOn && <Pill tone={doc.expiresOn < today ? "danger" : "warn"}>{doc.expiresOn < today ? "Expired" : "Expires"} {formatDate(doc.expiresOn)}</Pill>}
          </span>
        }
        title={doc.title}
        actions={
          <ButtonLink href={`/documents/${id}/edit`} variant="secondary" size="sm">
            <Pencil className="size-4" aria-hidden /> Edit
          </ButtonLink>
        }
      />
      <div className="flex flex-col gap-5">
        {file && fileHref ? (
          <Card className="overflow-hidden">
            {previewable ? (
              isImageType(file.contentType) ? (
                // eslint-disable-next-line @next/next/no-img-element
                <a href={fileHref} target="_blank" rel="noopener"><img src={fileHref} alt={doc.title} className="w-full max-h-[70vh] object-contain bg-surface-2" /></a>
              ) : (
                <iframe src={fileHref} title={doc.title} className="w-full h-[60vh] bg-surface-2" />
              )
            ) : (
              <div className="p-6 flex items-center gap-3">
                <FileText className="size-8 text-accent" aria-hidden />
                <div>
                  <div className="font-medium">{file.filename}</div>
                  <div className="text-sm text-ink-2">Preview not available for this type. Download to open it.</div>
                </div>
              </div>
            )}
            <div className="flex flex-wrap items-center justify-between gap-2 px-4 py-3 border-t border-line text-sm">
              <span className="text-ink-2 truncate">{file.filename} · {formatBytes(file.sizeBytes)}</span>
              <span className="flex gap-2">
                {previewable && <a href={fileHref} target="_blank" rel="noopener" className="inline-flex items-center gap-1 font-semibold text-brand"><ExternalLink className="size-4" aria-hidden /> Open</a>}
                <a href={`${fileHref}?download=1`} className="inline-flex items-center gap-1 font-semibold text-brand"><Download className="size-4" aria-hidden /> Download</a>
              </span>
            </div>
          </Card>
        ) : (
          <div className="rounded-xl bg-warn-soft text-warn px-4 py-3 text-sm">
            This is a record only. No file has been uploaded, so nothing is backed up here yet.{" "}
            <Link href={`/documents/${id}/edit`} className="font-semibold underline">
              Attach the file
            </Link>
            .
          </div>
        )}
        <Card className="p-4 sm:p-5">
          <DescriptionList
            items={[
              doc.asset && { label: "Item", value: <Link href={`/inventory/${doc.asset.id}`} className="font-semibold text-brand">{doc.asset.name}</Link> },
              doc.project && { label: "Project", value: <Link href={`/projects/${doc.project.id}`} className="font-semibold text-brand">{doc.project.name}</Link> },
              doc.documentDate && { label: "Document date", value: formatDate(doc.documentDate) },
              doc.expiresOn && { label: "Expires", value: formatDate(doc.expiresOn) },
              { label: "Added", value: formatDate(doc.createdAt.toISOString().slice(0, 10)) },
              doc.notes && { label: "Notes", value: <span className="whitespace-pre-wrap">{doc.notes}</span> },
            ]}
          />
        </Card>
        <div className="pt-4 border-t border-line">
          <ConfirmForm action={deleteDocumentAction} hidden={{ id }} confirm={`Delete "${doc.title}"${file ? " and its file" : ""}? This cannot be undone.`} variant="danger" size="sm">
            Delete document
          </ConfirmForm>
        </div>
      </div>
    </>
  );
}
