import { requirePropertyCtx } from "@/core/auth/session";
import { getDocument } from "@/core/services/documents";
import { listAssets } from "@/core/services/assets";
import { listProjects } from "@/core/services/projects";
import { env } from "@/core/env";
import { orNotFound } from "@/lib/not-found";
import { PageHeader } from "@/components/ui/page";
import { DocumentForm } from "../../document-form";

export const metadata = { title: "Edit document" };

export default async function EditDocumentPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const ctx = await requirePropertyCtx();
  const [doc, assets, projects] = await Promise.all([orNotFound(getDocument(ctx, id)), listAssets(ctx, { status: "all" }), listProjects(ctx, "all")]);
  return (
    <>
      <PageHeader back={{ href: `/documents/${id}`, label: doc.title }} title="Edit document" />
      <DocumentForm doc={{ ...doc, file: doc.file }} assets={assets.map((a) => ({ id: a.id, name: a.name }))} projects={projects.map((p) => ({ id: p.id, name: p.name }))} cancelHref={`/documents/${id}`} maxMb={Math.round(env.maxUploadBytes / 1024 / 1024)} />
    </>
  );
}
