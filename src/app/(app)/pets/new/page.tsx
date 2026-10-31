import { requirePropertyCtx } from "@/core/auth/session";
import { env } from "@/core/env";
import { PET_SPECIES } from "@/core/domain/validation";
import { PageHeader } from "@/components/ui/page";
import { PetForm } from "../pet-form";

export const metadata = { title: "Add a pet" };

export default async function NewPetPage({ searchParams }: { searchParams: Promise<{ species?: string }> }) {
  const { species } = await searchParams;
  await requirePropertyCtx();
  return (
    <>
      <PageHeader back={{ href: "/pets", label: "Pets" }} title="Add a pet" description="A name and the kind of animal is all you need. Everything else can wait until you have it." />
      <PetForm pet={{ species: (PET_SPECIES as readonly string[]).includes(species ?? "") ? species : undefined }} cancelHref="/pets" maxUploadMb={Math.round(env.maxUploadBytes / 1024 / 1024)} />
    </>
  );
}
