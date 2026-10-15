import { Select } from "@/components/ui/field";
import { ASSET_CATEGORIES, ASSET_CATEGORY_LABELS } from "@/core/domain/validation";
import { RECURRENCE_PRESETS } from "@/core/domain/recurrence";

type Opt = { id: string; name: string };

export function LocationSelect({ locations, defaultValue, name = "locationId", id = name }: { locations: Opt[]; defaultValue?: string | null; name?: string; id?: string }) {
  return (
    <Select id={id} name={name} defaultValue={defaultValue ?? ""}>
      <option value="">Not set</option>
      {locations.map((l) => (
        <option key={l.id} value={l.id}>
          {l.name}
        </option>
      ))}
    </Select>
  );
}

export function AssetSelect({ assets, defaultValue, name = "assetId", id = name }: { assets: Opt[]; defaultValue?: string | null; name?: string; id?: string }) {
  return (
    <Select id={id} name={name} defaultValue={defaultValue ?? ""}>
      <option value="">Not linked</option>
      {assets.map((a) => (
        <option key={a.id} value={a.id}>
          {a.name}
        </option>
      ))}
    </Select>
  );
}

export function ProviderSelect({ providers, defaultValue, name = "providerId", id = name }: { providers: Opt[]; defaultValue?: string | null; name?: string; id?: string }) {
  return (
    <Select id={id} name={name} defaultValue={defaultValue ?? ""}>
      <option value="">None</option>
      {providers.map((p) => (
        <option key={p.id} value={p.id}>
          {p.name}
        </option>
      ))}
    </Select>
  );
}

export function ProjectSelect({ projects, defaultValue, name = "projectId", id = name }: { projects: Opt[]; defaultValue?: string | null; name?: string; id?: string }) {
  return (
    <Select id={id} name={name} defaultValue={defaultValue ?? ""}>
      <option value="">Not linked</option>
      {projects.map((p) => (
        <option key={p.id} value={p.id}>
          {p.name}
        </option>
      ))}
    </Select>
  );
}

export function CategorySelect({ defaultValue, name = "category", id = name }: { defaultValue?: string | null; name?: string; id?: string }) {
  return (
    <Select id={id} name={name} defaultValue={defaultValue ?? "other"}>
      {ASSET_CATEGORIES.map((c) => (
        <option key={c} value={c}>
          {ASSET_CATEGORY_LABELS[c]}
        </option>
      ))}
    </Select>
  );
}

export function RecurrenceSelect({ defaultValue, name = "recurrence", id = name }: { defaultValue?: string | null; name?: string; id?: string }) {
  const known = RECURRENCE_PRESETS.some((p) => p.value === (defaultValue ?? ""));
  return (
    <Select id={id} name={name} defaultValue={defaultValue ?? ""}>
      {RECURRENCE_PRESETS.map((p) => (
        <option key={p.value || "once"} value={p.value}>
          {p.label}
        </option>
      ))}
      {!known && defaultValue && <option value={defaultValue}>Custom ({defaultValue.replace("-", " ")})</option>}
    </Select>
  );
}
