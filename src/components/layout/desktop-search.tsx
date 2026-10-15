import { Search } from "lucide-react";

export function DesktopSearch() {
  return (
    <form action="/search" className="relative w-72" role="search">
      <Search className="size-4 absolute left-3 top-1/2 -translate-y-1/2 text-ink-3" aria-hidden />
      <input
        type="search"
        name="q"
        placeholder="Search your home…"
        aria-label="Search"
        className="h-10 w-full rounded-xl border border-line bg-surface pl-9 pr-3 text-sm placeholder:text-ink-3 focus:border-brand focus:outline-none focus:ring-2 focus:ring-brand/20"
      />
    </form>
  );
}
