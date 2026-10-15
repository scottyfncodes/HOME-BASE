import Link from "next/link";
import { DoorOpen, MapPin, Package, Pencil, Plus } from "lucide-react";
import { requirePropertyCtx } from "@/core/auth/session";
import { formatAddress, getProperty } from "@/core/services/property";
import { listLocationsWithCounts } from "@/core/services/locations";
import { listAssets } from "@/core/services/assets";
import { HOME_TYPE_LABELS, LOCATION_KIND_LABELS, ASSET_CATEGORY_LABELS, type AssetCategory } from "@/core/domain/validation";
import { formatDate } from "@/core/domain/dates";
import { formatCents } from "@/core/domain/money";
import { ButtonLink } from "@/components/ui/button";
import { Card, DescriptionList, EmptyState, PageHeader, Pill, Row, Section } from "@/components/ui/page";

export const metadata = { title: "My Home" };

export default async function MyHomePage() {
  const ctx = await requirePropertyCtx();
  const [property, locations, assets] = await Promise.all([getProperty(ctx), listLocationsWithCounts(ctx), listAssets(ctx, { limit: 200 })]);
  const address = formatAddress(property);
  const unplaced = assets.filter((a) => !a.locationId);
  const systems = assets.filter((a) => ["hvac", "water_heater", "plumbing", "electrical", "roofing", "structure", "safety"].includes(a.category));

  return (
    <>
      <PageHeader
        eyebrow="My Home"
        title={property.name}
        description={address || "No address on file"}
        actions={
          <ButtonLink href="/my-home/edit" variant="secondary" size="sm">
            <Pencil className="size-4" aria-hidden /> Edit details
          </ButtonLink>
        }
      />

      <div className="flex flex-col gap-6">
        <Card className="p-4 sm:p-5">
          <DescriptionList
            items={[
              property.homeType && { label: "Type", value: HOME_TYPE_LABELS[property.homeType as keyof typeof HOME_TYPE_LABELS] ?? property.homeType },
              property.yearBuilt && { label: "Year built", value: property.yearBuilt },
              property.squareFeet && { label: "Size", value: `${property.squareFeet.toLocaleString()} sq ft` },
              (property.bedrooms != null || property.bathrooms) && { label: "Beds / baths", value: `${property.bedrooms ?? "–"} / ${property.bathrooms ?? "–"}` },
              property.lotSize && { label: "Lot", value: property.lotSize },
              property.purchaseDate && { label: "Purchased", value: `${formatDate(property.purchaseDate)}${property.purchasePriceCents ? ` · ${formatCents(property.purchasePriceCents, { compact: true })}` : ""}` },
              { label: "Time zone", value: property.timezone },
              property.notes && { label: "Notes", value: <span className="whitespace-pre-wrap">{property.notes}</span> },
            ]}
          />
          {!property.homeType && !property.yearBuilt && !property.squareFeet && (
            <p className="text-sm text-ink-2">
              Add details like year built and square footage from{" "}
              <Link href="/my-home/edit" className="font-semibold text-brand">
                Edit details
              </Link>
              . They help with maintenance guidance and insurance paperwork.
            </p>
          )}
        </Card>

        <Section
          title="Rooms & areas"
          action={
            <ButtonLink href="/my-home/locations/new" variant="ghost" size="sm">
              <Plus className="size-4" aria-hidden /> Add
            </ButtonLink>
          }
        >
          {locations.length === 0 ? (
            <EmptyState compact icon={<DoorOpen />} title="No rooms yet" description="Rooms and areas give your systems and appliances a place to live." action={<ButtonLink href="/my-home/locations/new" size="sm">Add a room</ButtonLink>} />
          ) : (
            <Card className="divide-y divide-line overflow-hidden">
              {locations.map((l) => (
                <Row
                  key={l.id}
                  href={`/my-home/locations/${l.id}`}
                  icon={<MapPin />}
                  title={l.name}
                  subtitle={[LOCATION_KIND_LABELS[l.kind], l.floor].filter(Boolean).join(" · ")}
                  meta={`${l.assetCount} ${l.assetCount === 1 ? "item" : "items"}`}
                />
              ))}
              {unplaced.length > 0 && (
                <Row href="/inventory?location=none" icon={<Package />} title="Not assigned to a room" meta={`${unplaced.length} ${unplaced.length === 1 ? "item" : "items"}`} />
              )}
            </Card>
          )}
        </Section>

        <Section
          title="Major systems"
          description="Heating, cooling, water, electrical, roof and safety."
          action={
            <ButtonLink href="/inventory/new?category=hvac" variant="ghost" size="sm">
              <Plus className="size-4" aria-hidden /> Add
            </ButtonLink>
          }
        >
          {systems.length === 0 ? (
            <EmptyState compact icon={<Package />} title="No systems recorded" description="Start with the furnace, water heater or electrical panel." action={<ButtonLink href="/inventory/new?category=hvac" size="sm">Add a system</ButtonLink>} />
          ) : (
            <Card className="divide-y divide-line overflow-hidden">
              {systems.map((a) => (
                <Row
                  key={a.id}
                  href={`/inventory/${a.id}`}
                  icon={<Package />}
                  title={a.name}
                  subtitle={[a.manufacturer, a.model, a.location?.name].filter(Boolean).join(" · ") || undefined}
                  trailing={<Pill>{ASSET_CATEGORY_LABELS[a.category as AssetCategory] ?? a.category}</Pill>}
                />
              ))}
            </Card>
          )}
        </Section>
      </div>
    </>
  );
}
