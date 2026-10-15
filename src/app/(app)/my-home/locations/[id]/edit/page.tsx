import { notFound } from "next/navigation";
import { requirePropertyCtx } from "@/core/auth/session";
import { getLocation } from "@/core/services/locations";
import { isAppError } from "@/core/errors";
import { PageHeader } from "@/components/ui/page";
import { LocationForm } from "../../../location-form";

export const metadata = { title: "Edit room" };

export default async function EditLocationPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const ctx = await requirePropertyCtx();
  const location = await getLocation(ctx, id).catch((e) => {
    if (isAppError(e) && e.code === "not_found") notFound();
    throw e;
  });
  return (
    <>
      <PageHeader back={{ href: `/my-home/locations/${id}`, label: location.name }} title="Edit room" />
      <LocationForm location={location} />
    </>
  );
}
