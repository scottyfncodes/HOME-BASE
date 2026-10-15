import { requirePropertyCtx } from "@/core/auth/session";
import { listLocations } from "@/core/services/locations";
import { PageHeader } from "@/components/ui/page";
import { ProjectForm } from "../project-form";

export const metadata = { title: "New project" };

export default async function NewProjectPage() {
  const ctx = await requirePropertyCtx();
  const locations = await listLocations(ctx);
  return (
    <>
      <PageHeader back={{ href: "/projects", label: "Projects" }} title="New project" />
      <ProjectForm locations={locations} cancelHref="/projects" />
    </>
  );
}
