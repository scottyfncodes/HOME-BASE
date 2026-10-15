import { Package, Plus, Search } from "lucide-react";
import { requirePropertyCtx } from "@/core/auth/session";
import { listAssets, type AssetSort } from "@/core/services/assets";
import { listLocations } from "@/core/services/locations";
import { ASSET_CATEGORIES, ASSET_CATEGORY_LABELS, type AssetCategory } from "@/core/domain/validation";
import { formatDate } from "@/core/domain/dates";
import { ButtonLink } from "@/components/ui/button";
import { Input, Select } from "@/components/ui/field";
import { Card, EmptyState, PageHeader, Pill, Row } from "@/components/ui/page";

export const metadata = { title: "Inventory" };

type Params = { q?: string; category?: string; location?: string; status?: string; sort?: string };

export default async function InventoryPage({ searchParams }: { searchParams: Promise<Params> }) {
  const sp = await searchParams;
  const ctx = await requirePropertyCtx();
  const status = sp.status === "retired" || sp.status === "all" ? sp.status : "active";
  const sort = (["name", "newest", "warranty", "value"] as const).includes(sp.sort as AssetSort) ? (sp.sort as AssetSort) : "name";
  const [assets, locations] = await Promise.all([
    listAssets(ctx, { q: sp.q, category: sp.category, locationId: sp.location && sp.location !== "none" ? sp.location : undefined, status, sort }),
    listLocations(ctx),
  ]);
  const shown = sp.location === "none" ? assets.filter((a) => !a.locationId) : assets;
  const filtering = Boolean(sp.q || sp.category || sp.location || status !== "active");

  return (
    <>
      <PageHeader
        title="Inventory"
        description="Every appliance, system and piece of equipment, with its records in one place."
        actions={
          <ButtonLink href="/inventory/new" size="sm">
            <Plus className="size-4" aria-hidden /> Add item
          </ButtonLink>
        }
      />
      <form className="flex flex-col gap-2 mb-4" action="/inventory">
        <div className="relative">
          <Search className="size-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-ink-3" aria-hidden />
          <Input type="search" name="q" defaultValue={sp.q} placeholder="Search name, brand, model, serial" className="pl-10" aria-label="Search inventory" />
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
          <Select name="category" defaultValue={sp.category ?? ""} aria-label="Category">
            <option value="">All categories</option>
            {ASSET_CATEGORIES.map((c) => (
              <option key={c} value={c}>
                {ASSET_CATEGORY_LABELS[c]}
              </option>
            ))}
          </Select>
          <Select name="location" defaultValue={sp.location ?? ""} aria-label="Location">
            <option value="">All rooms</option>
            {locations.map((l) => (
              <option key={l.id} value={l.id}>
                {l.name}
              </option>
            ))}
            <option value="none">No room</option>
          </Select>
          <Select name="status" defaultValue={status} aria-label="Status">
            <option value="active">Active</option>
            <option value="retired">Retired / replaced</option>
            <option value="all">All</option>
          </Select>
          <Select name="sort" defaultValue={sort} aria-label="Sort">
            <option value="name">Name A–Z</option>
            <option value="newest">Recently added</option>
            <option value="warranty">Warranty expiring</option>
            <option value="value">Highest value</option>
          </Select>
        </div>
        <button type="submit" className="sr-only">
          Apply filters
        </button>
        <noscript>
          <button type="submit" className="text-sm font-semibold text-brand">
            Apply
          </button>
        </noscript>
      </form>

      {shown.length === 0 ? (
        filtering ? (
          <EmptyState compact icon={<Search />} title="No items match" description="Try clearing a filter or searching for something else." action={<ButtonLink href="/inventory" variant="secondary" size="sm">Clear filters</ButtonLink>} />
        ) : (
          <EmptyState
            icon={<Package />}
            title="Your inventory is empty"
            description="Add your appliances and home systems. Each one becomes the single place for its manual, receipts, warranty and maintenance history."
            action={<ButtonLink href="/inventory/new">Add your first item</ButtonLink>}
          />
        )
      ) : (
        <Card className="divide-y divide-line overflow-hidden">
          {shown.map((a) => (
            <Row
              key={a.id}
              href={`/inventory/${a.id}`}
              icon={<Package />}
              title={a.name}
              subtitle={[a.manufacturer, a.model, a.location?.name].filter(Boolean).join(" · ") || ASSET_CATEGORY_LABELS[a.category as AssetCategory]}
              meta={sort === "warranty" && a.warrantyExpiresOn ? `Warranty ${formatDate(a.warrantyExpiresOn)}` : undefined}
              trailing={a.status !== "active" ? <Pill tone="warn">{a.status}</Pill> : <Pill>{ASSET_CATEGORY_LABELS[a.category as AssetCategory]}</Pill>}
            />
          ))}
        </Card>
      )}
      <FilterAutoSubmit />
    </>
  );
}

function FilterAutoSubmit() {
  // Progressive enhancement: submit the filter form when a select changes.
  return (
    <script
      dangerouslySetInnerHTML={{
        __html: `document.querySelectorAll('form[action="/inventory"] select').forEach(function(s){s.addEventListener('change',function(){s.form.requestSubmit()})})`,
      }}
    />
  );
}
