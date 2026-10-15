"use client";
import { ActionForm } from "@/components/ui/action-form";
import { Field, FormActions, FormGrid, FormMessage, FormSection, Input, Select, Textarea } from "@/components/ui/field";
import { SubmitButton } from "@/components/ui/submit-button";
import { ButtonLink } from "@/components/ui/button";
import { AssetSelect, ProjectSelect } from "@/components/forms/pickers";
import { FileUpload } from "@/components/documents/file-upload";
import { DOCUMENT_CATEGORIES, DOCUMENT_CATEGORY_LABELS } from "@/core/domain/validation";
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
  notes?: string | null;
  file?: { id: string; filename: string; contentType: string; sizeBytes: number } | null;
};

export function DocumentForm({ doc, assets, projects, cancelHref, back, maxMb }: { doc?: DocFormValues; assets: Opt[]; projects: Opt[]; cancelHref: string; back?: string; maxMb: number }) {
  const editing = Boolean(doc?.id);
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
                    {DOCUMENT_CATEGORIES.map((c) => (
                      <option key={c} value={c}>
                        {DOCUMENT_CATEGORY_LABELS[c]}
                      </option>
                    ))}
                  </Select>
                </Field>
                <Field label="Document date" htmlFor="documentDate" optional error={state.errors?.documentDate}>
                  <Input id="documentDate" name="documentDate" type="date" defaultValue={v("documentDate", doc?.documentDate)} />
                </Field>
                <Field label="Related item" htmlFor="assetId" optional error={state.errors?.assetId}>
                  <AssetSelect assets={assets} defaultValue={v("assetId", doc?.assetId)} />
                </Field>
                <Field label="Related project" htmlFor="projectId" optional error={state.errors?.projectId}>
                  <ProjectSelect projects={projects} defaultValue={v("projectId", doc?.projectId)} />
                </Field>
                <Field label="Expires on" htmlFor="expiresOn" optional error={state.errors?.expiresOn} hint="Warranties, policies, permits.">
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
