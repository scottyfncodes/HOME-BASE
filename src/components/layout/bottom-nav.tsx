"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { MOBILE_NAV, isActive } from "./nav-items";
import { cn } from "@/lib/cn";

export function BottomNav() {
  const pathname = usePathname();
  return (
    <nav
      aria-label="Primary"
      className="md:hidden fixed inset-x-0 bottom-0 z-40 bg-surface/95 backdrop-blur border-t border-line safe-bottom"
    >
      <ul className="grid grid-cols-5" style={{ height: "var(--nav-h)" }}>
        {MOBILE_NAV.map((item) => {
          const active = isActive(pathname, item.href);
          const Icon = item.icon;
          return (
            <li key={item.href} className="min-w-0">
              <Link
                href={item.href}
                aria-current={active ? "page" : undefined}
                className={cn(
                  "h-full flex flex-col items-center justify-center gap-1 text-[11px] font-semibold transition-colors",
                  active ? "text-brand" : "text-ink-3 hover:text-ink-2",
                )}
              >
                <span className={cn("rounded-xl px-3 py-1 transition-colors", active && "bg-brand-soft")}>
                  <Icon className="size-5" strokeWidth={active ? 2.4 : 2} aria-hidden />
                </span>
                <span className="truncate max-w-full">{item.label}</span>
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
