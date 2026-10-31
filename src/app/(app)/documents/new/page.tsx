import { requirePropertyCtx } from "@/core/auth/session";
import { listAssets } from "@/core/services/assets";
import { listProjects } from "@/core/services/projects";
import { listPets } from "@/core/services/pets";
import { env } from "@/core/env";
import { PageHeader } from "@/components/ui/page";
import { DocumentForm } from "../document-form";

export const metadata = { title: "Add document" };

export default async function NewDocumentPage({ searchParams }: { searchParams: Promise<{ assetId?: string; projectId?: string; petId?: string; category?: string }> }) {
  const sp = await searchParams;
  const ctx = await requirePropertyCtx();
  const [assets, projects, pets] = await Promise.all([listAssets(ctx, { status: "all" }), listProjects(ctx, "all"), listPets(ctx)]);
  const pet = sp.petId ? pets.find((p) => p.id === sp.petId) : undefined;
  const back = sp.assetId ? `/inventory/${sp.assetId}` : sp.projectId ? `/projects/${sp.projectId}` : pet ? `/pets/${pet.id}/documents` : undefined;
  return (
    <>
      <PageHeader back={{ href: back ?? "/documents", label: "Back" }} title={sp.category === "photo" ? "Add a photo" : pet ? `Add a document for ${pet.name}` : "Add a document"} />
      <DocumentForm
        doc={{ assetId: sp.assetId, projectId: sp.projectId, petId: pet?.id, category: sp.category ?? (pet ? "vaccination" : undefined) }}
        assets={assets.map((a) => ({ id: a.id, name: a.name }))}
        projects={projects.map((p) => ({ id: p.id, name: p.name }))}
        pets={pets.map((p) => ({ id: p.id, name: p.name }))}
        cancelHref={back ?? "/documents"}
        back={back}
        maxMb={Math.round(env.maxUploadBytes / 1024 / 1024)}
      />
    </>
  );
}
