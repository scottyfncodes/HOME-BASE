import Link from "next/link";
import { Pencil, Phone } from "lucide-react";
import { requirePropertyCtx } from "@/core/auth/session";
import { getPreparedness } from "@/core/services/preparedness";
import { orNotFound } from "@/lib/not-found";
import { PREPAREDNESS_KIND_LABELS } from "@/core/domain/validation";
import { ButtonLink } from "@/components/ui/button";
import { Card, DescriptionList, PageHeader } from "@/components/ui/page";
import { ConfirmForm } from "@/components/ui/confirm-form";
import { deletePreparednessAction } from "../actions";

export default async function PreparednessItemPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const ctx = await requirePropertyCtx();
  const item = await orNotFound(getPreparedness(ctx, id));
  return (
    <>
      <PageHeader
        back={{ href: "/preparedness", label: "Preparedness" }}
        eyebrow={item.kind === "pet" ? (item.pet ? `Pets · ${item.pet.name}` : "Pets · every pet") : PREPAREDNESS_KIND_LABELS[item.kind]}
        title={item.title}
        actions={
          <ButtonLink href={`/preparedness/${id}/edit`} variant="secondary" size="sm">
            <Pencil className="size-4" aria-hidden /> Edit
          </ButtonLink>
        }
      />
      <div className="flex flex-col gap-4">
        {item.phone && (
          <a href={`tel:${item.phone.replace(/[^\d+]/g, "")}`} className="card p-4 flex items-center gap-3 hover:bg-surface-2/60">
            <div className="size-12 rounded-xl bg-brand text-brand-ink flex items-center justify-center">
              <Phone className="size-5" aria-hidden />
            </div>
            <div>
              <div className="eyebrow">Call</div>
              <div className="font-display text-xl font-semibold">{item.phone}</div>
            </div>
          </a>
        )}
        {(item.whereText || item.location) && (
          <Card className="p-4 sm:p-5">
            <div className="eyebrow mb-1">Where</div>
            <div className="font-display text-xl font-semibold">{item.whereText ?? item.location?.name}</div>
            {item.whereText && item.location && (
              <div className="text-sm text-ink-2 mt-0.5">
                <Link href={`/my-home/locations/${item.location.id}`} className="font-semibold text-brand">{item.location.name}</Link>
              </div>
            )}
          </Card>
        )}
        {item.instructions && (
          <Card className="p-4 sm:p-5">
            <div className="eyebrow mb-1">{item.kind === "pet" ? "Instructions" : item.phone ? "Notes" : "How to use it"}</div>
            <p className="whitespace-pre-wrap text-[17px] leading-relaxed">{item.instructions}</p>
          </Card>
        )}
        {item.details && (
          <Card className="p-4 sm:p-5">
            <DescriptionList items={[{ label: "Details", value: <span className="whitespace-pre-wrap font-mono text-sm">{item.details}</span> }]} />
          </Card>
        )}
        <div className="pt-4 border-t border-line">
          <ConfirmForm action={deletePreparednessAction} hidden={{ id }} confirm={`Delete "${item.title}"?`} variant="danger" size="sm">
            Delete record
          </ConfirmForm>
        </div>
      </div>
    </>
  );
}
