import type { ReactNode } from "react";
import { BottomNav } from "./bottom-nav";
import { Sidebar } from "./sidebar";
import { TopBar } from "./top-bar";
import { DesktopSearch } from "./desktop-search";

export function AppShell({ children, propertyName }: { children: ReactNode; propertyName: string }) {
  return (
    <div className="flex min-h-dvh">
      <Sidebar propertyName={propertyName} />
      <div className="flex-1 min-w-0 flex flex-col">
        <TopBar propertyName={propertyName} />
        <div className="hidden md:flex items-center justify-end px-8 pt-5">
          <DesktopSearch />
        </div>
        <main className="flex-1 w-full max-w-5xl mx-auto px-4 sm:px-6 md:px-8 pt-4 pb-[calc(var(--nav-h)+env(safe-area-inset-bottom)+1.5rem)] md:pb-12 fade-in">{children}</main>
      </div>
      <BottomNav />
    </div>
  );
}
