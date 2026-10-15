import { requirePropertyCtx } from "@/core/auth/session";
import { getProject } from "@/core/services/projects";
import { listLocations } from "@/core/services/locations";
import { orNotFound } from "@/lib/not-found";
import { PageHeader } from "@/components/ui/page";
import { ProjectForm } from "../../project-form";

export const metadata = { title: "Edit project" };

export default async function EditProjectPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const ctx = await requirePropertyCtx();
  const [project, locations] = await Promise.all([orNotFound(getProject(ctx, id)), listLocations(ctx)]);
  return (
    <>
      <PageHeader back={{ href: `/projects/${id}`, label: project.name }} title="Edit project" />
      <ProjectForm project={project} locations={locations} cancelHref={`/projects/${id}`} />
    </>
  );
}
