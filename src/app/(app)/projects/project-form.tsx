"use client";
import { LocationField } from "@/components/forms/location-field";
import { ActionForm } from "@/components/ui/action-form";
import { Field, FormActions, FormGrid, FormMessage, FormSection, Input, Select, Textarea } from "@/components/ui/field";
import { SubmitButton } from "@/components/ui/submit-button";
import { ButtonLink } from "@/components/ui/button";
import { PRIORITIES, PROJECT_STATUSES, PROJECT_STATUS_LABELS } from "@/core/domain/validation";
import { centsToInput } from "@/core/domain/money";
import { createProjectAction, updateProjectAction } from "./actions";

export type ProjectFormValues = {
  id?: string;
  name?: string;
  description?: string | null;
  status?: string;
  priority?: string;
  startOn?: string | null;
  targetOn?: string | null;
  completedOn?: string | null;
  budgetCents?: number | null;
  locationId?: string | null;
  notes?: string | null;
};

export function ProjectForm({ project, locations, cancelHref }: { project?: ProjectFormValues; locations: Array<{ id: string; name: string }>; cancelHref: string }) {
  const editing = Boolean(project?.id);
  return (
    <ActionForm action={editing ? updateProjectAction : createProjectAction}>
      {(state) => {
        const v = (k: string, fallback: string | null | undefined) => state.values?.[k] ?? fallback ?? "";
        return (
          <>
            {project?.id && <input type="hidden" name="id" value={project.id} />}
            <FormMessage message={state.ok === false ? state.message : undefined} />
            <FormSection title="Project">
              <Field label="Name" htmlFor="name" error={state.errors?.name}>
                <Input id="name" name="name" placeholder="Replace kitchen faucet" defaultValue={v("name", project?.name)} required autoFocus={!editing} />
              </Field>
              <Field label="Description" htmlFor="description" optional>
                <Textarea id="description" name="description" defaultValue={v("description", project?.description)} rows={3} />
              </Field>
              <FormGrid>
                <Field label="Status" htmlFor="status">
                  <Select id="status" name="status" defaultValue={v("status", project?.status ?? "planned")}>
                    {PROJECT_STATUSES.map((s) => (
                      <option key={s} value={s}>
                        {PROJECT_STATUS_LABELS[s]}
                      </option>
                    ))}
                  </Select>
                </Field>
                <Field label="Priority" htmlFor="priority">
                  <Select id="priority" name="priority" defaultValue={v("priority", project?.priority ?? "normal")}>
                    {PRIORITIES.map((p) => (
                      <option key={p} value={p}>
                        {p[0].toUpperCase() + p.slice(1)}
                      </option>
                    ))}
                  </Select>
                </Field>
                <LocationField locations={locations} label="Room / area" defaultValue={v("locationId", project?.locationId)} defaultNewName={state.values?.newLocationName} defaultNewKind={state.values?.newLocationKind} error={state.errors?.locationId} newNameError={state.errors?.newLocationName} />
                <Field label="Budget" htmlFor="budget" optional error={state.errors?.budget}>
                  <Input id="budget" name="budget" inputMode="decimal" placeholder="2,500" defaultValue={v("budget", centsToInput(project?.budgetCents))} />
                </Field>
              </FormGrid>
            </FormSection>
            <FormSection title="Timeline">
              <FormGrid>
                <Field label="Start" htmlFor="startOn" optional error={state.errors?.startOn}>
                  <Input id="startOn" name="startOn" type="date" defaultValue={v("startOn", project?.startOn)} />
                </Field>
                <Field label="Target finish" htmlFor="targetOn" optional error={state.errors?.targetOn}>
                  <Input id="targetOn" name="targetOn" type="date" defaultValue={v("targetOn", project?.targetOn)} />
                </Field>
                {editing && (
                  <Field label="Completed on" htmlFor="completedOn" optional error={state.errors?.completedOn}>
                    <Input id="completedOn" name="completedOn" type="date" defaultValue={v("completedOn", project?.completedOn)} />
                  </Field>
                )}
              </FormGrid>
              <Field label="Notes" htmlFor="notes" optional>
                <Textarea id="notes" name="notes" defaultValue={v("notes", project?.notes)} rows={3} />
              </Field>
            </FormSection>
            <FormActions>
              <ButtonLink href={cancelHref} variant="secondary">
                Cancel
              </ButtonLink>
              <SubmitButton>{editing ? "Save changes" : "Create project"}</SubmitButton>
            </FormActions>
          </>
        );
      }}
    </ActionForm>
  );
}
