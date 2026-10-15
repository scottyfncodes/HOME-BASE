"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { PRIMARY_NAV, SECONDARY_NAV, isActive } from "./nav-items";
import { cn } from "@/lib/cn";
import { Logo } from "./logo";

export function Sidebar({ propertyName }: { propertyName: string }) {
  const pathname = usePathname();
  const render = (items: typeof PRIMARY_NAV) =>
    items.map((item) => {
      const active = isActive(pathname, item.href);
      const Icon = item.icon;
      return (
        <li key={item.href}>
          <Link
            href={item.href}
            aria-current={active ? "page" : undefined}
            className={cn(
              "flex items-center gap-3 rounded-xl px-3 py-2 text-[15px] font-medium transition-colors",
              active ? "bg-brand-soft text-brand" : "text-ink-2 hover:bg-surface-2 hover:text-ink",
            )}
          >
            <Icon className="size-5" strokeWidth={active ? 2.4 : 2} aria-hidden />
            {item.label}
          </Link>
        </li>
      );
    });
  return (
    <aside className="hidden md:flex md:flex-col w-64 shrink-0 border-r border-line bg-surface/60 sticky top-0 h-dvh overflow-y-auto">
      <div className="px-5 pt-6 pb-4">
        <Link href="/home" className="flex items-center gap-2.5">
          <Logo className="size-9" />
          <div>
            <div className="font-display font-semibold text-lg leading-tight">Home Base</div>
            <div className="text-xs text-ink-3 truncate max-w-40">{propertyName}</div>
          </div>
        </Link>
      </div>
      <nav className="px-3 flex-1 flex flex-col gap-6" aria-label="Primary">
        <ul className="flex flex-col gap-0.5">{render(PRIMARY_NAV)}</ul>
        <ul className="flex flex-col gap-0.5 border-t border-line pt-4">{render(SECONDARY_NAV)}</ul>
      </nav>
      <div className="px-5 py-4 text-xs text-ink-3">by HaveAnApp</div>
    </aside>
  );
}
