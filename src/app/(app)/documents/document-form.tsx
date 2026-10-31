"use client";
import { ActionForm } from "@/components/ui/action-form";
import { Field, FormActions, FormGrid, FormMessage, FormSection, Input, Select, Textarea } from "@/components/ui/field";
import { SubmitButton } from "@/components/ui/submit-button";
import { ButtonLink } from "@/components/ui/button";
import { AssetSelect, ProjectSelect } from "@/components/forms/pickers";
import { FileUpload } from "@/components/documents/file-upload";
import { DOCUMENT_CATEGORIES, DOCUMENT_CATEGORY_LABELS, PET_DOCUMENT_CATEGORIES } from "@/core/domain/validation";
import { createDocumentAction, updateDocumentAction } from "./actions";

type Opt = { id: string; name: string };
export type DocFormValues = {
  id?: string;
  title?: string;
  category?: string;
  documentDate?: string | null;
  expiresOn?: string | null;
  assetId?: string | null;
  projectId?: string | null;
  petId?: string | null;
  notes?: string | null;
  file?: { id: string; filename: string; contentType: string; sizeBytes: number } | null;
};

export function DocumentForm({ doc, assets, projects, pets = [], cancelHref, back, maxMb }: { doc?: DocFormValues; assets: Opt[]; projects: Opt[]; pets?: Opt[]; cancelHref: string; back?: string; maxMb: number }) {
  const editing = Boolean(doc?.id);
  // Filing for a pet puts the pet categories first; everything stays available.
  const forPet = Boolean(doc?.petId);
  const categories = forPet ? [...PET_DOCUMENT_CATEGORIES, ...DOCUMENT_CATEGORIES.filter((c) => !(PET_DOCUMENT_CATEGORIES as readonly string[]).includes(c))] : DOCUMENT_CATEGORIES;
  return (
    <ActionForm action={editing ? updateDocumentAction : createDocumentAction}>
      {(state) => {
        const v = (k: string, fallback: string | null | undefined) => state.values?.[k] ?? fallback ?? "";
        return (
          <>
            {doc?.id && <input type="hidden" name="id" value={doc.id} />}
            {back && <input type="hidden" name="back" value={back} />}
            <FormMessage message={state.ok === false ? state.message : undefined} />
            <FormSection title="File" description={editing ? "Replace or remove the attached file." : "Optional. You can record a document without uploading it, but only the uploaded file is actually backed up here."}>
              <FileUpload existing={doc?.file ?? null} maxMb={maxMb} />
            </FormSection>
            <FormSection title="About this document">
              <Field label="Title" htmlFor="title" error={state.errors?.title}>
                <Input id="title" name="title" placeholder="Furnace owner's manual" defaultValue={v("title", doc?.title)} required />
              </Field>
              <FormGrid>
                <Field label="Category" htmlFor="category" error={state.errors?.category}>
                  <Select id="category" name="category" defaultValue={v("category", doc?.category ?? "other")}>
                    {categories.map((c) => (
                      <option key={c} value={c}>
                        {DOCUMENT_CATEGORY_LABELS[c]}
                      </option>
                    ))}
                  </Select>
                </Field>
                <Field label="Document date" htmlFor="documentDate" optional error={state.errors?.documentDate}>
                  <Input id="documentDate" name="documentDate" type="date" defaultValue={v("documentDate", doc?.documentDate)} />
                </Field>
                {pets.length > 0 && (
                  <Field label="Pet" htmlFor="petId" optional error={state.errors?.petId}>
                    <Select id="petId" name="petId" defaultValue={v("petId", doc?.petId)}>
                      <option value="">Not for a pet</option>
                      {pets.map((p) => (
                        <option key={p.id} value={p.id}>
                          {p.name}
                        </option>
                      ))}
                    </Select>
                  </Field>
                )}
                {!forPet && (
                  <>
                    <Field label="Related item" htmlFor="assetId" optional error={state.errors?.assetId}>
                      <AssetSelect assets={assets} defaultValue={v("assetId", doc?.assetId)} />
                    </Field>
                    <Field label="Related project" htmlFor="projectId" optional error={state.errors?.projectId}>
                      <ProjectSelect projects={projects} defaultValue={v("projectId", doc?.projectId)} />
                    </Field>
                  </>
                )}
                {forPet && doc?.assetId && <input type="hidden" name="assetId" value={doc.assetId} />}
                {forPet && doc?.projectId && <input type="hidden" name="projectId" value={doc.projectId} />}
                <Field label="Expires on" htmlFor="expiresOn" optional error={state.errors?.expiresOn} hint={forPet ? "Certificates, registrations, policies." : "Warranties, policies, permits."}>
                  <Input id="expiresOn" name="expiresOn" type="date" defaultValue={v("expiresOn", doc?.expiresOn)} />
                </Field>
              </FormGrid>
              <Field label="Notes" htmlFor="notes" optional>
                <Textarea id="notes" name="notes" defaultValue={v("notes", doc?.notes)} rows={3} />
              </Field>
            </FormSection>
            <FormActions>
              <ButtonLink href={cancelHref} variant="secondary">
                Cancel
              </ButtonLink>
              <SubmitButton>{editing ? "Save changes" : "Save document"}</SubmitButton>
            </FormActions>
          </>
        );
      }}
    </ActionForm>
  );
}
