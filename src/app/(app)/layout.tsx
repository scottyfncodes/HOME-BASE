import { requireCtx } from "@/core/auth/session";
import { getPrimaryProperty } from "@/core/services/household";
import { AppShell } from "@/components/layout/app-shell";

export const dynamic = "force-dynamic";

/**
 * The shell only needs a signed-in household member. Pages that work on a
 * property (dashboard, inventory, ...) call `requirePropertyCtx()` themselves
 * and send users without a home to onboarding; account-level pages such as
 * Settings and Service providers stay reachable before that step.
 */
export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const ctx = await requireCtx();
  const property = await getPrimaryProperty(ctx);
  return <AppShell propertyName={property?.name ?? "Home Base"}>{children}</AppShell>;
}
