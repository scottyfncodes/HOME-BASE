import { Search } from "lucide-react";
import { requirePropertyCtx } from "@/core/auth/session";
import { searchEverything } from "@/core/services/search";
import { Card, EmptyState, PageHeader, Pill, Row } from "@/components/ui/page";
import { Input } from "@/components/ui/field";

export const metadata = { title: "Search" };

const KIND_LABEL: Record<string, string> = {
  asset: "Item",
  task: "Task",
  document: "Document",
  project: "Project",
  location: "Room",
  provider: "Provider",
  preparedness: "Preparedness",
  pet: "Pet",
};

export default async function SearchPage({ searchParams }: { searchParams: Promise<{ q?: string }> }) {
  const { q = "" } = await searchParams;
  const ctx = await requirePropertyCtx();
  const hits = q.trim().length >= 2 ? await searchEverything(ctx, q) : [];
  return (
    <>
      <PageHeader title="Search" description="Across rooms, items, tasks, projects, documents and contacts. The Vault is never searched." />
      <form action="/search" role="search" className="mb-5">
        <div className="relative">
          <Search className="size-5 absolute left-3.5 top-1/2 -translate-y-1/2 text-ink-3" aria-hidden />
          <Input type="search" name="q" defaultValue={q} placeholder="Water heater, serial number, roofer…" className="pl-11 h-12" autoFocus aria-label="Search" />
        </div>
      </form>
      {q.trim().length < 2 ? null : hits.length === 0 ? (
        <EmptyState compact title={`Nothing matched “${q}”`} description="Try a different word, or check the Vault if it is something sensitive." />
      ) : (
        <Card className="divide-y divide-line overflow-hidden">
          {hits.map((h) => (
            <Row key={`${h.kind}-${h.id}`} href={h.href} title={h.title} subtitle={h.subtitle ?? undefined} trailing={<Pill>{KIND_LABEL[h.kind]}</Pill>} />
          ))}
        </Card>
      )}
    </>
  );
}
