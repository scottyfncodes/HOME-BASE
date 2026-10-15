import { requirePropertyCtx } from "@/core/auth/session";
import { listLocations } from "@/core/services/locations";
import { PREPAREDNESS_KINDS } from "@/core/domain/validation";
import { PageHeader } from "@/components/ui/page";
import { PreparednessForm } from "../preparedness-form";

export const metadata = { title: "Add preparedness record" };

export default async function NewPreparednessPage({ searchParams }: { searchParams: Promise<{ kind?: string }> }) {
  const { kind } = await searchParams;
  const ctx = await requirePropertyCtx();
  const locations = await listLocations(ctx);
  return (
    <>
      <PageHeader back={{ href: "/preparedness", label: "Preparedness" }} title="Add a record" description="Write it the way you would explain it to a house sitter." />
      <PreparednessForm item={{ kind: (PREPAREDNESS_KINDS as readonly string[]).includes(kind ?? "") ? kind : undefined }} locations={locations} cancelHref="/preparedness" />
    </>
  );
}
