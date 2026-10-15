import { notFound } from "next/navigation";
import { Package, Pencil, Plus } from "lucide-react";
import { requirePropertyCtx } from "@/core/auth/session";
import { getLocation } from "@/core/services/locations";
import { listAssets } from "@/core/services/assets";
import { isAppError } from "@/core/errors";
import { ASSET_CATEGORY_LABELS, LOCATION_KIND_LABELS, type AssetCategory } from "@/core/domain/validation";
import { ButtonLink } from "@/components/ui/button";
import { Card, EmptyState, PageHeader, Pill, Row, Section } from "@/components/ui/page";
import { ConfirmForm } from "@/components/ui/confirm-form";
import { deleteLocationAction } from "../../actions";

export default async function LocationPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const ctx = await requirePropertyCtx();
  const location = await getLocation(ctx, id).catch((e) => {
    if (isAppError(e) && e.code === "not_found") notFound();
    throw e;
  });
  const assets = await listAssets(ctx, { locationId: id, status: "all" });
  return (
    <>
      <PageHeader
        back={{ href: "/my-home", label: "My Home" }}
        eyebrow={[LOCATION_KIND_LABELS[location.kind], location.floor].filter(Boolean).join(" · ")}
        title={location.name}
        description={location.notes}
        actions={
          <ButtonLink href={`/my-home/locations/${id}/edit`} variant="secondary" size="sm">
            <Pencil className="size-4" aria-hidden /> Edit
          </ButtonLink>
        }
      />
      <Section
        title="In this room"
        action={
          <ButtonLink href={`/inventory/new?locationId=${id}`} variant="ghost" size="sm">
            <Plus className="size-4" aria-hidden /> Add item
          </ButtonLink>
        }
      >
        {assets.length === 0 ? (
          <EmptyState compact icon={<Package />} title="Nothing here yet" description="Add the appliances, fixtures and equipment that live in this room." action={<ButtonLink href={`/inventory/new?locationId=${id}`} size="sm">Add an item</ButtonLink>} />
        ) : (
          <Card className="divide-y divide-line overflow-hidden">
            {assets.map((a) => (
              <Row key={a.id} href={`/inventory/${a.id}`} icon={<Package />} title={a.name} subtitle={[a.manufacturer, a.model].filter(Boolean).join(" ") || undefined} trailing={<Pill tone={a.status === "active" ? "neutral" : "warn"}>{a.status === "active" ? ASSET_CATEGORY_LABELS[a.category as AssetCategory] : a.status}</Pill>} />
            ))}
          </Card>
        )}
      </Section>
      <div className="mt-8 pt-6 border-t border-line">
        <ConfirmForm action={deleteLocationAction} hidden={{ id }} confirm={`Delete "${location.name}"? Items in it are kept and simply become unassigned.`} variant="danger" size="sm">
          Delete room
        </ConfirmForm>
      </div>
    </>
  );
}
