import { requirePropertyCtx } from "@/core/auth/session";
import { listAssets } from "@/core/services/assets";
import { listProjects } from "@/core/services/projects";
import { env } from "@/core/env";
import { PageHeader } from "@/components/ui/page";
import { DocumentForm } from "../document-form";

export const metadata = { title: "Add document" };

export default async function NewDocumentPage({ searchParams }: { searchParams: Promise<{ assetId?: string; projectId?: string; category?: string }> }) {
  const sp = await searchParams;
  const ctx = await requirePropertyCtx();
  const [assets, projects] = await Promise.all([listAssets(ctx, { status: "all" }), listProjects(ctx, "all")]);
  const back = sp.assetId ? `/inventory/${sp.assetId}` : sp.projectId ? `/projects/${sp.projectId}` : undefined;
  return (
    <>
      <PageHeader back={{ href: back ?? "/documents", label: "Back" }} title={sp.category === "photo" ? "Add a photo" : "Add a document"} />
      <DocumentForm
        doc={{ assetId: sp.assetId, projectId: sp.projectId, category: sp.category }}
        assets={assets.map((a) => ({ id: a.id, name: a.name }))}
        projects={projects.map((p) => ({ id: p.id, name: p.name }))}
        cancelHref={back ?? "/documents"}
        back={back}
        maxMb={Math.round(env.maxUploadBytes / 1024 / 1024)}
      />
    </>
  );
}
