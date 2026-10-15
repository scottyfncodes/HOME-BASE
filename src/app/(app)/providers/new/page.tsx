import { PageHeader } from "@/components/ui/page";
import { ProviderForm } from "../provider-form";

export const metadata = { title: "Add provider" };

export default async function NewProviderPage({ searchParams }: { searchParams: Promise<{ back?: string }> }) {
  const { back } = await searchParams;
  return (
    <>
      <PageHeader back={{ href: "/providers", label: "Providers" }} title="Add a service provider" />
      <ProviderForm back={back?.startsWith("/") ? back : undefined} />
    </>
  );
}
