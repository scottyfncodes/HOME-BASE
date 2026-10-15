import Link from "next/link";
import { BookOpen, CalendarClock, FileText, Hammer, History, Pencil, Plus, Receipt } from "lucide-react";
import { requirePropertyCtx } from "@/core/auth/session";
import { getAssetDetail } from "@/core/services/assets";
import { projectsForAsset } from "@/core/services/projects";
import { orNotFound } from "@/lib/not-found";
import { ASSET_CATEGORY_LABELS, DOCUMENT_CATEGORY_LABELS, type AssetCategory } from "@/core/domain/validation";
import { describeDue, formatDate, todayIn } from "@/core/domain/dates";
import { formatCents, sumCents } from "@/core/domain/money";
import { guidesForCategory } from "@/features/learn/guides";
import { ButtonLink } from "@/components/ui/button";
import { Card, DescriptionList, EmptyState, PageHeader, Pill, Row, Section } from "@/components/ui/page";
import { ConfirmForm } from "@/components/ui/confirm-form";
import { deleteAssetAction, reactivateAssetAction, retireAssetAction } from "../actions";
import { DocumentThumb } from "@/components/documents/document-thumb";

export default async function AssetPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const ctx = await requirePropertyCtx();
  const { item, tasks, logs, documents, expenses } = await orNotFound(getAssetDetail(ctx, id));
  const projects = await projectsForAsset(ctx, id);
  const today = todayIn(ctx.timezone);
  const guides = guidesForCategory(item.category);
  const lifetimeCost = sumCents([...logs.map((l) => l.costCents), ...expenses.map((e) => e.amountCents)]);

  return (
    <>
      <PageHeader
        back={{ href: "/inventory", label: "Inventory" }}
        eyebrow={
          <span className="inline-flex items-center gap-2">
            {ASSET_CATEGORY_LABELS[item.category as AssetCategory] ?? item.category}
            {item.status !== "active" && <Pill tone="warn">{item.status === "replaced" ? "Replaced" : "Retired"}{item.retiredOn ? ` ${formatDate(item.retiredOn)}` : ""}</Pill>}
          </span>
        }
        title={item.name}
        description={[item.manufacturer, item.model].filter(Boolean).join(" ") || undefined}
        actions={
          <ButtonLink href={`/inventory/${id}/edit`} variant="secondary" size="sm">
            <Pencil className="size-4" aria-hidden /> Edit
          </ButtonLink>
        }
      />

      <div className="flex flex-col gap-6">
        <Card className="p-4 sm:p-5 flex flex-col gap-4">
          <DescriptionList
            items={[
              item.location && { label: "Location", value: <Link href={`/my-home/locations/${item.location.id}`} className="text-brand font-semibold">{item.location.name}</Link> },
              item.serialNumber && { label: "Serial number", value: <span className="font-mono text-sm">{item.serialNumber}</span> },
              item.installDate && { label: "Installed", value: formatDate(item.installDate) },
              item.purchaseDate && { label: "Purchased", value: `${formatDate(item.purchaseDate)}${item.purchasePriceCents ? ` · ${formatCents(item.purchasePriceCents)}` : ""}` },
              item.replacementValueCents && { label: "Replacement value", value: formatCents(item.replacementValueCents) },
              item.warrantyExpiresOn && { label: "Warranty", value: <span className={item.warrantyExpiresOn < today ? "text-ink-3" : undefined}>{item.warrantyExpiresOn < today ? `Expired ${formatDate(item.warrantyExpiresOn)}` : `Until ${formatDate(item.warrantyExpiresOn)}`}</span> },
              lifetimeCost > 0 && { label: "Spent on upkeep", value: formatCents(lifetimeCost) },
              item.notes && { label: "Notes", value: <span className="whitespace-pre-wrap">{item.notes}</span> },
            ]}
          />
          {!item.serialNumber && !item.installDate && !item.notes && <p className="text-sm text-ink-2">No details recorded yet. Serial number and install date make warranty claims and part orders much easier.</p>}
        </Card>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
          <ButtonLink href={`/maintenance/new?assetId=${id}`} variant="secondary" size="sm"><CalendarClock className="size-4" aria-hidden /> Schedule</ButtonLink>
          <ButtonLink href={`/maintenance/history/new?assetId=${id}`} variant="secondary" size="sm"><History className="size-4" aria-hidden /> Log work</ButtonLink>
          <ButtonLink href={`/documents/new?assetId=${id}`} variant="secondary" size="sm"><FileText className="size-4" aria-hidden /> Add document</ButtonLink>
          <ButtonLink href={`/documents/new?assetId=${id}&category=photo`} variant="secondary" size="sm"><Plus className="size-4" aria-hidden /> Add photo</ButtonLink>
        </div>

        <Section title="Scheduled maintenance">
          {tasks.length === 0 ? (
            <EmptyState compact icon={<CalendarClock />} title="Nothing scheduled" description="Add a recurring task so upkeep comes to you." action={<ButtonLink href={`/maintenance/new?assetId=${id}`} size="sm" variant="secondary">Schedule</ButtonLink>} />
          ) : (
            <Card className="divide-y divide-line overflow-hidden">
              {tasks.map((t) => (
                <Row key={t.id} href={`/maintenance/${t.id}`} icon={<CalendarClock />} title={t.title} subtitle={t.recurrence ? "Recurring" : "One time"} meta={<span className={t.dueOn < today ? "text-danger font-semibold" : undefined}>{describeDue(t.dueOn, today)}</span>} />
              ))}
            </Card>
          )}
        </Section>

        <Section title="Documents & photos" action={documents.length > 0 ? <Link href={`/documents?assetId=${id}`} className="text-sm font-semibold text-brand">All</Link> : undefined}>
          {documents.length === 0 ? (
            <EmptyState compact icon={<FileText />} title="No documents attached" description="Manuals, receipts, warranty cards and photos of the data plate." action={<ButtonLink href={`/documents/new?assetId=${id}`} size="sm" variant="secondary">Add a document</ButtonLink>} />
          ) : (
            <Card className="divide-y divide-line overflow-hidden">
              {documents.map((d) => (
                <Row key={d.id} href={`/documents/${d.id}`} icon={<DocumentThumb file={d.file} />} title={d.title} subtitle={[DOCUMENT_CATEGORY_LABELS[d.category as keyof typeof DOCUMENT_CATEGORY_LABELS] ?? d.category, d.documentDate ? formatDate(d.documentDate) : null].filter(Boolean).join(" · ")} meta={d.file ? undefined : <Pill tone="warn">No file</Pill>} />
              ))}
            </Card>
          )}
        </Section>

        <Section title="History">
          {logs.length === 0 ? (
            <EmptyState compact icon={<History />} title="No history yet" description="Completed tasks and logged service calls show up here, even after the item is retired." />
          ) : (
            <Card className="divide-y divide-line overflow-hidden">
              {logs.map((l) => (
                <Row key={l.id} icon={<History />} title={l.title} subtitle={[l.provider?.name, l.notes].filter(Boolean).join(" · ") || undefined} meta={<span>{formatDate(l.completedOn)}{l.costCents ? <><br />{formatCents(l.costCents)}</> : null}</span>} />
              ))}
            </Card>
          )}
        </Section>

        {(projects.length > 0 || expenses.length > 0) && (
          <Section title="Projects & expenses">
            <Card className="divide-y divide-line overflow-hidden">
              {projects.map((p) => (
                <Row key={p.id} href={`/projects/${p.id}`} icon={<Hammer />} title={p.name} subtitle={p.status.replace("_", " ")} />
              ))}
              {expenses.map((e) => (
                <Row key={e.id} icon={<Receipt />} title={e.title} subtitle={formatDate(e.spentOn)} meta={formatCents(e.amountCents)} />
              ))}
            </Card>
          </Section>
        )}

        {guides.length > 0 && (
          <Section title="Learn">
            <Card className="divide-y divide-line overflow-hidden">
              {guides.map((g) => (
                <Row key={g.slug} href={`/learn/${g.slug}`} icon={<BookOpen />} title={g.title} subtitle={g.summary} />
              ))}
            </Card>
          </Section>
        )}

        <div className="pt-6 border-t border-line flex flex-wrap gap-3">
          {item.status === "active" ? (
            <>
              <ConfirmForm action={retireAssetAction} hidden={{ id, status: "retired" }} confirm={`Mark "${item.name}" as retired? Its history stays, and scheduled tasks are cancelled.`} variant="secondary" size="sm">
                Mark as retired
              </ConfirmForm>
              <ConfirmForm action={retireAssetAction} hidden={{ id, status: "replaced" }} confirm={`Mark "${item.name}" as replaced? Its history stays, and scheduled tasks are cancelled.`} variant="secondary" size="sm">
                Mark as replaced
              </ConfirmForm>
            </>
          ) : (
            <ConfirmForm action={reactivateAssetAction} hidden={{ id }} confirm={`Bring "${item.name}" back as active?`} variant="secondary" size="sm">
              Reactivate
            </ConfirmForm>
          )}
          <ConfirmForm action={deleteAssetAction} hidden={{ id }} confirm={`Permanently delete "${item.name}"? Maintenance history and documents are kept but will no longer reference it. Prefer "retired" if it still existed at some point.`} variant="danger" size="sm">
            Delete permanently
          </ConfirmForm>
        </div>
      </div>
    </>
  );
}
