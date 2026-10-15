"use client";
import { useState } from "react";
import { Field, Input, Select } from "@/components/ui/field";
import { inferLocationKind, LOCATION_KINDS, NEW_LOCATION_VALUE, type LocationKind } from "@/core/domain/validation";
import { cn } from "@/lib/cn";

const KIND_CHOICES: Array<{ kind: LocationKind; label: string }> = [
  { kind: "room", label: "Room" },
  { kind: "area", label: "Hallway / area" },
  { kind: "exterior", label: "Outside" },
  { kind: "utility", label: "Utility space" },
  { kind: "storage", label: "Closet / storage" },
];

function asKind(value: string | undefined): LocationKind | null {
  return value && (LOCATION_KINDS as readonly string[]).includes(value) ? (value as LocationKind) : null;
}

/**
 * Location picker that can also create a location on the spot. Choosing
 * "Add a new location…" reveals a name field and a kind picker; the server
 * creates the location (or reuses one with the same name) when the form is
 * saved, so every home's layout can be described without leaving the form.
 */
export function LocationField({
  locations,
  label = "Location",
  hint,
  defaultValue,
  defaultNewName,
  defaultNewKind,
  error,
  newNameError,
  id = "locationId",
}: {
  locations: Array<{ id: string; name: string }>;
  label?: string;
  hint?: string;
  defaultValue?: string | null;
  defaultNewName?: string;
  defaultNewKind?: string;
  error?: string;
  newNameError?: string;
  id?: string;
}) {
  const [choice, setChoice] = useState(defaultValue ?? "");
  const [name, setName] = useState(defaultNewName ?? "");
  // null = not picked by hand yet, so the kind follows what the name suggests.
  const [pickedKind, setPickedKind] = useState<LocationKind | null>(asKind(defaultNewKind));
  const kind = pickedKind ?? inferLocationKind(name);
  const adding = choice === NEW_LOCATION_VALUE;

  return (
    <Field
      label={label}
      htmlFor={id}
      optional
      error={error}
      hint={adding ? undefined : (hint ?? (locations.length === 0 ? "No rooms yet. Choose “Add a new location” to create one." : undefined))}
      className={adding ? "sm:col-span-2" : undefined}
    >
      <Select id={id} name="locationId" value={choice} onChange={(e) => setChoice(e.target.value)}>
        <option value="">Not set</option>
        {locations.map((l) => (
          <option key={l.id} value={l.id}>
            {l.name}
          </option>
        ))}
        <option value={NEW_LOCATION_VALUE}>+ Add a new location…</option>
      </Select>
      {adding && (
        <div className="mt-1 rounded-xl border border-line bg-surface-2/60 p-3 sm:p-4 flex flex-col gap-3">
          <div className="flex flex-col gap-1.5">
            <label htmlFor={`${id}-new-name`} className="text-sm font-semibold text-ink-2">
              Name the new location
            </label>
            <Input
              id={`${id}-new-name`}
              name="newLocationName"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Hallway, Outside east wall, Garage…"
              invalid={Boolean(newNameError)}
              autoFocus
              maxLength={80}
            />
            {newNameError && (
              <p className="text-sm text-danger" role="alert">
                {newNameError}
              </p>
            )}
          </div>
          <fieldset className="flex flex-col gap-1.5">
            <legend className="text-sm font-semibold text-ink-2 mb-1.5">What kind of place is it?</legend>
            <div className="flex flex-wrap gap-2">
              {KIND_CHOICES.map((c) => (
                <label key={c.kind} className="cursor-pointer">
                  <input
                    type="radio"
                    name="newLocationKind"
                    value={c.kind}
                    checked={kind === c.kind}
                    onChange={() => setPickedKind(c.kind)}
                    className="peer sr-only"
                  />
                  <span
                    className={cn(
                      "inline-flex h-9 items-center rounded-full border border-line-strong bg-surface px-3.5 text-sm font-semibold transition-colors",
                      "peer-checked:bg-brand peer-checked:text-brand-ink peer-checked:border-brand peer-focus-visible:ring-2 peer-focus-visible:ring-brand/40",
                    )}
                  >
                    {c.label}
                  </span>
                </label>
              ))}
            </div>
          </fieldset>
          <p className="text-xs text-ink-3">Saved to My Home, so you can pick it again for other items.</p>
        </div>
      )}
    </Field>
  );
}
