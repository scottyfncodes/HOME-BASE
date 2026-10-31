import { FileText, Plus, Search } from "lucide-react";
import { requirePropertyCtx } from "@/core/auth/session";
import { listDocuments } from "@/core/services/documents";
import { DOCUMENT_CATEGORIES, DOCUMENT_CATEGORY_LABELS } from "@/core/domain/validation";
import { formatDate } from "@/core/domain/dates";
import { ButtonLink } from "@/components/ui/button";
import { Input, Select } from "@/components/ui/field";
import { Card, EmptyState, PageHeader, Pill, Row } from "@/components/ui/page";
import { DocumentThumb } from "@/components/documents/document-thumb";

export const metadata = { title: "Documents" };

export default async function DocumentsPage({ searchParams }: { searchParams: Promise<{ q?: string; category?: string; assetId?: string; projectId?: string; petId?: string }> }) {
  const sp = await searchParams;
  const ctx = await requirePropertyCtx();
  const docs = await listDocuments(ctx, { q: sp.q, category: sp.category, assetId: sp.assetId, projectId: sp.projectId, petId: sp.petId });
  const filtering = Boolean(sp.q || sp.category || sp.assetId || sp.projectId || sp.petId);
  return (
    <>
      <PageHeader
        title="Documents"
        description="Manuals, receipts, warranties, inspections, permits. Attached to the item or project they belong to."
        actions={
          <ButtonLink href="/documents/new" size="sm">
            <Plus className="size-4" aria-hidden /> Add
          </ButtonLink>
        }
      />
      <form action="/documents" className="flex flex-col sm:flex-row gap-2 mb-4">
        {sp.assetId && <input type="hidden" name="assetId" value={sp.assetId} />}
        {sp.projectId && <input type="hidden" name="projectId" value={sp.projectId} />}
        {sp.petId && <input type="hidden" name="petId" value={sp.petId} />}
        <div className="relative flex-1">
          <Search className="size-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-ink-3" aria-hidden />
          <Input type="search" name="q" defaultValue={sp.q} placeholder="Search titles and notes" className="pl-10" aria-label="Search documents" />
        </div>
        <Select name="category" defaultValue={sp.category ?? ""} aria-label="Category" className="sm:w-56">
          <option value="">All categories</option>
          {DOCUMENT_CATEGORIES.map((c) => (
            <option key={c} value={c}>
              {DOCUMENT_CATEGORY_LABELS[c]}
            </option>
          ))}
        </Select>
        <button type="submit" className="sr-only">
          Apply
        </button>
      </form>
      {docs.length === 0 ? (
        filtering ? (
          <EmptyState compact icon={<Search />} title="No documents match" action={<ButtonLink href="/documents" variant="secondary" size="sm">Clear filters</ButtonLink>} />
        ) : (
          <EmptyState icon={<FileText />} title="No documents yet" description="Start with the manuals and receipts you already have as photos on your phone. Each one can be linked to the item it describes." action={<ButtonLink href="/documents/new">Add a document</ButtonLink>} />
        )
      ) : (
        <Card className="divide-y divide-line overflow-hidden">
          {docs.map((d) => (
            <Row
              key={d.id}
              href={`/documents/${d.id}`}
              icon={<DocumentThumb file={d.file} />}
              title={d.title}
              subtitle={[d.asset?.name ?? d.project?.name ?? d.pet?.name, d.documentDate ? formatDate(d.documentDate) : null].filter(Boolean).join(" · ") || undefined}
              trailing={d.file ? <Pill>{DOCUMENT_CATEGORY_LABELS[d.category as keyof typeof DOCUMENT_CATEGORY_LABELS] ?? d.category}</Pill> : <Pill tone="warn">No file</Pill>}
            />
          ))}
        </Card>
      )}
      <script dangerouslySetInnerHTML={{ __html: `document.querySelectorAll('form[action="/documents"] select').forEach(function(s){s.addEventListener('change',function(){s.form.requestSubmit()})})` }} />
    </>
  );
}
