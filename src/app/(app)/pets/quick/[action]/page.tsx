import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { requirePropertyCtx } from "@/core/auth/session";
import { listPets } from "@/core/services/pets";
import { PageHeader } from "@/components/ui/page";
import { PetAvatar } from "@/components/pets/pet-avatar";

const ACTIONS = {
  visit: { title: "Log a vet visit", path: "health/new?kind=vet_visit" },
  vaccination: { title: "Record a vaccination", path: "vaccinations/new" },
  weight: { title: "Record weight", path: "health/new?kind=weight" },
  medication: { title: "Add medication", path: "medications/new" },
  routine: { title: "Schedule care", path: "care/new" },
  expense: { title: "Add an expense", path: "expenses/new" },
  document: { title: "Upload a document", path: "" },
} as const;

export const metadata = { title: "Choose a pet" };

/** Household-level quick actions: pick the pet (skipped when there is only one). */
export default async function QuickActionPage({ params }: { params: Promise<{ action: string }> }) {
  const { action } = await params;
  const a = ACTIONS[action as keyof typeof ACTIONS];
  if (!a) notFound();
  const ctx = await requirePropertyCtx();
  const pets = await listPets(ctx);
  const target = (id: string) => (action === "document" ? `/documents/new?petId=${id}` : `/pets/${id}/${a.path}`);
  if (pets.length === 0) redirect("/pets/new");
  if (pets.length === 1) redirect(target(pets[0].id));
  return (
    <>
      <PageHeader back={{ href: "/pets", label: "Pets" }} title={a.title} description="For which pet?" />
      <ul className="grid grid-cols-1 sm:grid-cols-2 gap-2">
        {pets.map((p) => (
          <li key={p.id}>
            <Link href={target(p.id)} className="card flex items-center gap-3 p-3 min-h-16 hover:bg-surface-2/60 transition-colors">
              <PetAvatar name={p.name} photoFileId={p.photoFileId} size="lg" />
              <span className="font-display text-xl font-semibold">{p.name}</span>
            </Link>
          </li>
        ))}
      </ul>
    </>
  );
}
