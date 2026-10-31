import Link from "next/link";
import { listDocuments } from "@/core/services/documents";
import { formatDate, todayIn } from "@/core/domain/dates";
import { possessive } from "@/core/domain/pets";
import { DOCUMENT_CATEGORY_LABELS } from "@/core/domain/validation";
import { ButtonLink } from "@/components/ui/button";
import { Card, Pill } from "@/components/ui/page";
import { DocumentThumb } from "@/components/documents/document-thumb";
import { loadPet } from "../../../load";

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }) {
  const { pet } = await loadPet((await params).id);
  return { title: `${pet.name} · Documents` };
}

export default async function PetDocumentsPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { ctx, pet } = await loadPet(id);
  const today = todayIn(ctx.timezone);
  const docs = await listDocuments(ctx, { petId: id });

  return (
    <div className="flex flex-col gap-5">
      <div className="flex flex-wrap gap-2">
        <ButtonLink href={`/documents/new?petId=${id}`} size="sm">Upload a document</ButtonLink>
        <ButtonLink href={`/documents/new?petId=${id}&category=vaccination`} size="sm" variant="secondary">Vaccination certificate</ButtonLink>
        <ButtonLink href={`/documents/new?petId=${id}&category=adoption`} size="sm" variant="secondary">Adoption papers</ButtonLink>
      </div>
      {docs.length === 0 ? (
        <Card className="p-4 sm:p-5 text-[15px] text-ink-2">
          Keep {possessive(pet.name)} paperwork here: vaccination certificates, vet invoices, medical records, adoption papers, microchip registration, insurance and prescriptions. Files are private to your household.
        </Card>
      ) : (
        <Card className="divide-y divide-line overflow-hidden">
          {docs.map((d) => (
            <Link key={d.id} href={`/documents/${d.id}`} className="flex items-center gap-3 px-4 py-3 min-h-16 hover:bg-surface-2/60">
              <div className="size-10 shrink-0 rounded-xl bg-surface-2 text-ink-2 flex items-center justify-center [&>svg]:size-5">
                <DocumentThumb file={d.file} />
              </div>
              <div className="min-w-0 flex-1">
                <div className="font-medium text-[15px] leading-snug truncate">{d.title}</div>
                <div className="text-sm text-ink-2 truncate mt-0.5">{[DOCUMENT_CATEGORY_LABELS[d.category as keyof typeof DOCUMENT_CATEGORY_LABELS] ?? d.category, d.documentDate ? formatDate(d.documentDate) : null].filter(Boolean).join(" · ")}</div>
              </div>
              {d.expiresOn ? <Pill tone={d.expiresOn < today ? "danger" : "neutral"}>{d.expiresOn < today ? "Expired" : `Expires ${formatDate(d.expiresOn, { year: false })}`}</Pill> : !d.file ? <Pill tone="warn">No file</Pill> : null}
            </Link>
          ))}
        </Card>
      )}
    </div>
  );
}
