"use client";
import { useState } from "react";
import { ActionForm } from "@/components/ui/action-form";
import { Field, FormActions, FormGrid, FormMessage, FormSection, Input, Select, Textarea } from "@/components/ui/field";
import { SubmitButton } from "@/components/ui/submit-button";
import { ButtonLink } from "@/components/ui/button";
import { AssetSelect, LocationSelect } from "@/components/forms/pickers";
import { RECURRENCE_PRESETS, recurrenceToValue } from "@/core/domain/recurrence";
import { PRIORITIES } from "@/core/domain/validation";
import type { Recurrence } from "@/core/db/schema";
import { createTaskAction, updateTaskAction } from "./actions";

export type TaskFormValues = {
  id?: string;
  title?: string;
  description?: string | null;
  dueOn?: string;
  recurrence?: Recurrence | null;
  recurrenceValue?: string;
  priority?: string;
  assetId?: string | null;
  locationId?: string | null;
  estimatedMinutes?: number | null;
  guideSlug?: string | null;
};

type Opt = { id: string; name: string };

export function TaskForm({ task, assets, locations, today, cancelHref }: { task?: TaskFormValues; assets: Opt[]; locations: Opt[]; today: string; cancelHref: string }) {
  const editing = Boolean(task?.id);
  const initialRecurrence = task?.recurrenceValue ?? recurrenceToValue(task?.recurrence);
  const knownPreset = RECURRENCE_PRESETS.some((p) => p.value === initialRecurrence);
  const [recurrence, setRecurrence] = useState(knownPreset ? initialRecurrence : initialRecurrence ? "custom" : "");
  const custom = !knownPreset && initialRecurrence ? initialRecurrence.split("-") : ["3", "month"];

  return (
    <ActionForm action={editing ? updateTaskAction : createTaskAction}>
      {(state) => {
        const v = (k: string, fallback: string | number | null | undefined) => state.values?.[k] ?? (fallback == null ? "" : String(fallback));
        return (
          <>
            {task?.id && <input type="hidden" name="id" value={task.id} />}
            {task?.guideSlug && <input type="hidden" name="guideSlug" value={task.guideSlug} />}
            <FormMessage message={state.ok === false ? state.message : undefined} />
            <FormSection title="Task">
              <Field label="What needs doing?" htmlFor="title" error={state.errors?.title}>
                <Input id="title" name="title" placeholder="Change HVAC filter" defaultValue={v("title", task?.title)} required autoFocus={!editing && !task?.title} />
              </Field>
              <FormGrid>
                <Field label="Item" htmlFor="assetId" optional error={state.errors?.assetId}>
                  <AssetSelect assets={assets} defaultValue={v("assetId", task?.assetId)} />
                </Field>
                <Field label="Room / area" htmlFor="locationId" optional error={state.errors?.locationId}>
                  <LocationSelect locations={locations} defaultValue={v("locationId", task?.locationId)} />
                </Field>
              </FormGrid>
              <Field label="Details" htmlFor="description" optional hint="Filter size, which breaker, what to look for.">
                <Textarea id="description" name="description" defaultValue={v("description", task?.description)} rows={3} />
              </Field>
            </FormSection>
            <FormSection title="When">
              <FormGrid>
                <Field label={editing ? "Next due" : "First due"} htmlFor="dueOn" error={state.errors?.dueOn}>
                  <Input id="dueOn" name="dueOn" type="date" defaultValue={v("dueOn", task?.dueOn ?? today)} required />
                </Field>
                <Field label="Repeats" htmlFor="recurrence">
                  <Select id="recurrence" name="recurrence" value={recurrence} onChange={(e) => setRecurrence(e.target.value)}>
                    {RECURRENCE_PRESETS.map((p) => (
                      <option key={p.value || "once"} value={p.value}>
                        {p.label}
                      </option>
                    ))}
                    <option value="custom">Custom…</option>
                  </Select>
                </Field>
              </FormGrid>
              {recurrence === "custom" && (
                <FormGrid>
                  <Field label="Every" htmlFor="every">
                    <Input id="every" name="every" inputMode="numeric" defaultValue={v("every", custom[0])} />
                  </Field>
                  <Field label="Unit" htmlFor="unit">
                    <Select id="unit" name="unit" defaultValue={v("unit", custom[1])}>
                      <option value="day">days</option>
                      <option value="week">weeks</option>
                      <option value="month">months</option>
                      <option value="year">years</option>
                    </Select>
                  </Field>
                </FormGrid>
              )}
              {recurrence !== "" && (
                <Field label="Schedule the next one from" htmlFor="anchor" hint='"Due date" keeps a fixed rhythm (every April 1). "Completion date" restarts the clock when you finish.'>
                  <Select id="anchor" name="anchor" defaultValue={v("anchor", task?.recurrence?.anchor ?? "due")}>
                    <option value="due">The due date</option>
                    <option value="completed">The day I complete it</option>
                  </Select>
                </Field>
              )}
              <FormGrid>
                <Field label="Priority" htmlFor="priority">
                  <Select id="priority" name="priority" defaultValue={v("priority", task?.priority ?? "normal")}>
                    {PRIORITIES.map((p) => (
                      <option key={p} value={p}>
                        {p[0].toUpperCase() + p.slice(1)}
                      </option>
                    ))}
                  </Select>
                </Field>
                <Field label="Time it takes" htmlFor="estimatedMinutes" optional error={state.errors?.estimatedMinutes} hint="Minutes">
                  <Input id="estimatedMinutes" name="estimatedMinutes" inputMode="numeric" defaultValue={v("estimatedMinutes", task?.estimatedMinutes)} />
                </Field>
              </FormGrid>
            </FormSection>
            <FormActions>
              <ButtonLink href={cancelHref} variant="secondary">
                Cancel
              </ButtonLink>
              <SubmitButton>{editing ? "Save changes" : "Schedule"}</SubmitButton>
            </FormActions>
          </>
        );
      }}
    </ActionForm>
  );
}
