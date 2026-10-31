import Link from "next/link";
import { getHealthEvent } from "@/core/services/pet-health";
import { listProviders } from "@/core/services/providers";
import { todayIn } from "@/core/domain/dates";
import { weightToInput } from "@/core/domain/pets";
import { env } from "@/core/env";
import { orNotFound } from "@/lib/not-found";
import { Card, Section } from "@/components/ui/page";
import { ConfirmForm } from "@/components/ui/confirm-form";
import { DocumentThumb } from "@/components/documents/document-thumb";
import { PetPageHeader } from "@/components/pets/pet-page-header";
import { deleteHealthEventAction } from "../../../actions";
import { HealthEventForm } from "../../../record-forms";
import { loadPet } from "../../../load";

export const metadata = { title: "Health record" };

export default async function HealthEventPage({ params }: { params: Promise<{ id: string; eventId: string }> }) {
  const { id, eventId } = await params;
  const { ctx, pet } = await loadPet(id);
  const [event, providers] = await Promise.all([orNotFound(getHealthEvent(ctx, id, eventId)), listProviders(ctx)]);
  return (
    <>
      <PetPageHeader pet={pet} back={{ href: `/pets/${id}/health`, label: "Health" }} title={event.title} />
      <div className="flex flex-col gap-6">
        {event.documents.length > 0 && (
          <Section title="Attached">
            <Card className="divide-y divide-line overflow-hidden">
              {event.documents.map((d) => (
                <Link key={d.id} href={`/documents/${d.id}`} className="flex items-center gap-3 px-4 py-3 hover:bg-surface-2/60">
                  <span className="size-10 shrink-0 rounded-xl bg-surface-2 flex items-center justify-center [&>svg]:size-5">
                    <DocumentThumb file={d.file} />
                  </span>
                  <span className="font-medium text-[15px] truncate">{d.title}</span>
                </Link>
              ))}
            </Card>
          </Section>
        )}
        <HealthEventForm
          petId={id}
          petName={pet.name}
          event={{ ...event, costCents: event.expense?.amountCents ?? null, weight: weightToInput(event.weightGrams, pet.weightUnit) }}
          providers={providers.map((p) => ({ id: p.id, name: p.name }))}
          weightUnit={pet.weightUnit}
          cancelHref={`/pets/${id}/health`}
          today={todayIn(ctx.timezone)}
          maxMb={Math.round(env.maxUploadBytes / 1024 / 1024)}
        />
        <div className="pt-4 border-t border-line">
          <ConfirmForm action={deleteHealthEventAction} hidden={{ petId: id, id: eventId }} confirm={`Delete "${event.title}"?${event.expense ? " Its expense is removed too." : ""} Attached documents stay under ${pet.name}'s documents.`} variant="danger" size="sm">
            Delete record
          </ConfirmForm>
        </div>
      </div>
    </>
  );
}
