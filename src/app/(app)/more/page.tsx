import Link from "next/link";
import { ChevronRight, LogOut } from "lucide-react";
import { MORE_NAV } from "@/components/layout/nav-items";
import { PageHeader } from "@/components/ui/page";
import { SignOutButton } from "@/components/layout/sign-out-button";

export const metadata = { title: "More" };

export default function MorePage() {
  return (
    <>
      <PageHeader title="More" />
      <div className="card divide-y divide-line overflow-hidden">
        {MORE_NAV.map((item) => {
          const Icon = item.icon;
          return (
            <Link key={item.href} href={item.href} className="flex items-center gap-3 px-4 py-3.5 hover:bg-surface-2/70">
              <div className="size-10 rounded-xl bg-brand-soft text-brand flex items-center justify-center">
                <Icon className="size-5" aria-hidden />
              </div>
              <div className="flex-1 min-w-0">
                <div className="font-medium">{item.label}</div>
                {item.description && <div className="text-sm text-ink-2">{item.description}</div>}
              </div>
              <ChevronRight className="size-4 text-ink-3" aria-hidden />
            </Link>
          );
        })}
      </div>
      <div className="mt-6">
        <SignOutButton variant="secondary">
          <LogOut className="size-4" aria-hidden /> Sign out
        </SignOutButton>
      </div>
    </>
  );
}
