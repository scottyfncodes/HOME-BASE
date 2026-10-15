import Link from "next/link";
import { Search } from "lucide-react";
import { Logo } from "./logo";

export function TopBar({ propertyName }: { propertyName: string }) {
  return (
    <header className="md:hidden sticky top-0 z-30 bg-bg/90 backdrop-blur border-b border-line safe-top">
      <div className="h-14 px-4 flex items-center justify-between gap-3">
        <Link href="/home" className="flex items-center gap-2 min-w-0">
          <Logo className="size-8" />
          <span className="font-display font-semibold text-[17px] truncate">{propertyName}</span>
        </Link>
        <Link href="/search" aria-label="Search" className="size-10 rounded-xl flex items-center justify-center text-ink-2 hover:bg-surface-2">
          <Search className="size-5" />
        </Link>
      </div>
    </header>
  );
}
