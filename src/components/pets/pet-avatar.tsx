import { cn } from "@/lib/cn";

const SIZES = {
  xs: "size-6 text-[11px]",
  sm: "size-8 text-sm",
  md: "size-10 text-base",
  lg: "size-16 text-2xl",
  xl: "size-24 sm:size-28 text-4xl",
} as const;

/**
 * A pet's face everywhere in the app: their photo, or their initial set in
 * the display face when no photo has been added yet.
 */
export function PetAvatar({ name, photoFileId, size = "md", className }: { name: string; photoFileId?: string | null; size?: keyof typeof SIZES; className?: string }) {
  const cls = cn("shrink-0 rounded-full overflow-hidden", SIZES[size], className);
  if (photoFileId) {
    // eslint-disable-next-line @next/next/no-img-element
    return <img src={`/api/files/${photoFileId}`} alt="" className={cn(cls, "object-cover bg-surface-2")} loading="lazy" />;
  }
  return (
    <span aria-hidden className={cn(cls, "inline-flex items-center justify-center bg-accent-soft text-accent font-display font-semibold leading-none")}>
      {name.trim().charAt(0).toUpperCase() || "?"}
    </span>
  );
}

/** A large photo for pet cards; the initial on a warm field when there is none. */
export function PetPhoto({ name, photoFileId, className }: { name: string; photoFileId?: string | null; className?: string }) {
  if (photoFileId) {
    // eslint-disable-next-line @next/next/no-img-element
    return <img src={`/api/files/${photoFileId}`} alt={`Photo of ${name}`} className={cn("w-full h-full object-cover bg-surface-2", className)} loading="lazy" />;
  }
  return (
    <div aria-hidden className={cn("w-full h-full flex items-center justify-center bg-accent-soft text-accent font-display font-semibold text-6xl", className)}>
      {name.trim().charAt(0).toUpperCase() || "?"}
    </div>
  );
}
