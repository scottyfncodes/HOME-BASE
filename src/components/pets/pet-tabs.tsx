"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/cn";

/** Overview · Health · Care · Expenses · Documents, under the pet's header. */
export function PetTabs({ petId }: { petId: string }) {
  const pathname = usePathname();
  const base = `/pets/${petId}`;
  const tabs = [
    { href: base, label: "Overview" },
    { href: `${base}/health`, label: "Health" },
    { href: `${base}/care`, label: "Care" },
    { href: `${base}/expenses`, label: "Expenses" },
    { href: `${base}/documents`, label: "Documents" },
  ];
  return (
    <nav aria-label="Pet sections" className="-mx-4 px-4 sm:mx-0 sm:px-0 overflow-x-auto [scrollbar-width:none] border-b border-line">
      <ul className="flex gap-5 min-w-max">
        {tabs.map((t) => {
          const active = t.href === base ? pathname === base : pathname === t.href || pathname.startsWith(t.href + "/");
          return (
            <li key={t.href}>
              <Link
                href={t.href}
                aria-current={active ? "page" : undefined}
                className={cn(
                  "inline-flex h-11 items-center text-[15px] font-semibold border-b-2 -mb-px transition-colors",
                  active ? "border-brand text-ink" : "border-transparent text-ink-3 hover:text-ink-2",
                )}
              >
                {t.label}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
