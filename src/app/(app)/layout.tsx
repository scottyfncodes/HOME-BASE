import { requirePropertyCtx } from "@/core/auth/session";
import { getProperty } from "@/core/services/property";
import { AppShell } from "@/components/layout/app-shell";

export const dynamic = "force-dynamic";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const ctx = await requirePropertyCtx();
  const property = await getProperty(ctx);
  return <AppShell propertyName={property.name}>{children}</AppShell>;
}
