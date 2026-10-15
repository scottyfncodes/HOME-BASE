"use client";
import { ActionForm } from "@/components/ui/action-form";
import { Field, FormActions, FormGrid, FormMessage, FormSection, Input, Select, Textarea } from "@/components/ui/field";
import { SubmitButton } from "@/components/ui/submit-button";
import { ButtonLink } from "@/components/ui/button";
import { FileUpload } from "@/components/documents/file-upload";
import { VAULT_CATEGORIES, VAULT_CATEGORY_LABELS } from "@/core/domain/validation";
import { createVaultDocumentAction, updateVaultDocumentAction } from "./actions";

export type VaultDocValues = { id?: string; title?: string; category?: string; documentDate?: string | null; expiresOn?: string | null; notes?: string | null };

export function VaultDocumentForm({ doc, maxMb }: { doc?: VaultDocValues; maxMb: number }) {
  const editing = Boolean(doc?.id);
  return (
    <ActionForm action={editing ? updateVaultDocumentAction : createVaultDocumentAction}>
      {(state) => {
        const v = (k: string, fallback: string | null | undefined) => state.values?.[k] ?? fallback ?? "";
        return (
          <>
            {doc?.id && <input type="hidden" name="id" value={doc.id} />}
            <FormMessage message={state.ok === false ? state.message : undefined} />
            {!editing && (
              <FormSection title="File" description="Encrypted before it is stored. Images are downscaled in your browser first; use the original for anything you need at full resolution.">
                <FileUpload vault maxMb={maxMb} />
              </FormSection>
            )}
            <FormSection title="About this document">
              <Field label="Title" htmlFor="title" error={state.errors?.title}>
                <Input id="title" name="title" placeholder="Passport (Sam)" defaultValue={v("title", doc?.title)} required />
              </Field>
              <FormGrid>
                <Field label="Category" htmlFor="category">
                  <Select id="category" name="category" defaultValue={v("category", doc?.category ?? "other")}>
                    {VAULT_CATEGORIES.map((c) => (
                      <option key={c} value={c}>
                        {VAULT_CATEGORY_LABELS[c]}
                      </option>
                    ))}
                  </Select>
                </Field>
                <Field label="Document date" htmlFor="documentDate" optional error={state.errors?.documentDate}>
                  <Input id="documentDate" name="documentDate" type="date" defaultValue={v("documentDate", doc?.documentDate)} />
                </Field>
                <Field label="Expires" htmlFor="expiresOn" optional error={state.errors?.expiresOn}>
                  <Input id="expiresOn" name="expiresOn" type="date" defaultValue={v("expiresOn", doc?.expiresOn)} />
                </Field>
              </FormGrid>
              <Field label="Notes" htmlFor="notes" optional hint="Where the physical original is kept, for example.">
                <Textarea id="notes" name="notes" defaultValue={v("notes", doc?.notes)} rows={3} />
              </Field>
            </FormSection>
            <FormActions>
              <ButtonLink href={doc?.id ? `/vault/${doc.id}` : "/vault"} variant="secondary">
                Cancel
              </ButtonLink>
              <SubmitButton>{editing ? "Save changes" : "Save to Vault"}</SubmitButton>
            </FormActions>
          </>
        );
      }}
    </ActionForm>
  );
}
