import { requirePropertyCtx } from "@/core/auth/session";
import { getProperty } from "@/core/services/property";
import { PageHeader } from "@/components/ui/page";
import { PropertyForm } from "../property-form";

export const metadata = { title: "Edit home" };

export default async function EditPropertyPage() {
  const ctx = await requirePropertyCtx();
  const property = await getProperty(ctx);
  return (
    <>
      <PageHeader back={{ href: "/my-home", label: "My Home" }} title="Edit home details" />
      <PropertyForm property={property} />
    </>
  );
}
