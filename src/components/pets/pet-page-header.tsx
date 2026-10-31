import Link from "next/link";
import { ChevronLeft } from "lucide-react";
import type { ReactNode } from "react";
import { PetAvatar } from "./pet-avatar";

/** Header for a form or detail page inside one pet's profile. */
export function PetPageHeader({ pet, back, title, description }: { pet: { id: string; name: string; photoFileId: string | null }; back: { href: string; label: string }; title: ReactNode; description?: ReactNode }) {
  return (
    <header className="flex flex-col gap-3 mb-6">
      <Link href={back.href} className="inline-flex items-center gap-1 h-6 text-sm font-semibold text-brand -ml-1 w-fit">
        <ChevronLeft className="size-4" aria-hidden /> {back.label}
      </Link>
      <div className="flex items-center gap-3">
        <PetAvatar name={pet.name} photoFileId={pet.photoFileId} size="md" />
        <div className="min-w-0">
          <div className="eyebrow">{pet.name}</div>
          <h1 className="font-display text-[26px] sm:text-[30px] leading-[1.15] font-semibold tracking-tight">{title}</h1>
        </div>
      </div>
      {description && <p className="text-ink-2 text-[15px] leading-snug max-w-prose">{description}</p>}
    </header>
  );
}
