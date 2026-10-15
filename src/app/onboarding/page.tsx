import Link from "next/link";
import { redirect } from "next/navigation";
import { Check } from "lucide-react";
import { requireCtx } from "@/core/auth/session";
import { getPrimaryProperty, loadPropertyCtx } from "@/core/services/household";
import { listLocations } from "@/core/services/locations";
import { countAssets } from "@/core/services/assets";
import { Logo } from "@/components/layout/logo";
import { ButtonLink } from "@/components/ui/button";
import { PropertyStep } from "./steps/property-step";
import { RoomsStep } from "./steps/rooms-step";
import { FirstAssetStep } from "./steps/first-asset-step";
import { cn } from "@/lib/cn";

export const dynamic = "force-dynamic";
export const metadata = { title: "Set up your home" };

const STEPS = [
  { key: "property", label: "Your home" },
  { key: "rooms", label: "Rooms" },
  { key: "first", label: "First system" },
  { key: "done", label: "Ready" },
] as const;
type StepKey = (typeof STEPS)[number]["key"];

export default async function OnboardingPage({ searchParams }: { searchParams: Promise<{ step?: string }> }) {
  const ctx = await requireCtx();
  const property = await getPrimaryProperty(ctx);
  const { step: rawStep } = await searchParams;
  let step: StepKey = (STEPS.find((s) => s.key === rawStep)?.key ?? "property") as StepKey;
  if (!property) step = "property";
  else if (step === "property") step = "rooms";

  const pctx = property ? await loadPropertyCtx(ctx, property.id) : null;
  const locations = pctx ? await listLocations(pctx) : [];
  const assetCount = pctx ? await countAssets(pctx) : 0;
  if (step === "done" && !property) redirect("/onboarding");

  const index = STEPS.findIndex((s) => s.key === step);

  return (
    <main className="min-h-dvh safe-top safe-bottom">
      <div className="max-w-xl mx-auto px-5 py-6 sm:py-10 flex flex-col gap-6">
        <div className="flex items-center gap-2.5">
          <Logo className="size-9" />
          <span className="font-display font-semibold text-xl">Home Base</span>
        </div>
        <ol className="flex items-center gap-2 text-xs font-semibold" aria-label="Setup progress">
          {STEPS.map((s, i) => (
            <li key={s.key} className="flex items-center gap-2">
              <span className={cn("size-6 rounded-full flex items-center justify-center", i < index ? "bg-brand text-brand-ink" : i === index ? "bg-ink text-bg" : "bg-surface-2 text-ink-3")}>
                {i < index ? <Check className="size-3.5" aria-hidden /> : i + 1}
              </span>
              <span className={cn("hidden sm:inline", i === index ? "text-ink" : "text-ink-3")}>{s.label}</span>
              {i < STEPS.length - 1 && <span className="w-4 h-px bg-line-strong" aria-hidden />}
            </li>
          ))}
        </ol>

        {step === "property" && <PropertyStep />}
        {step === "rooms" && <RoomsStep existing={locations.map((l) => l.name)} />}
        {step === "first" && <FirstAssetStep locations={locations} assetCount={assetCount} />}
        {step === "done" && property && (
          <section className="card p-6 flex flex-col gap-4 fade-in">
            <div className="size-12 rounded-2xl bg-ok-soft text-ok flex items-center justify-center">
              <Check className="size-6" aria-hidden />
            </div>
            <div>
              <h1 className="font-display text-2xl font-semibold">{property.name} is set up</h1>
              <p className="text-ink-2 mt-1">
                {locations.length > 0 ? `${locations.length} ${locations.length === 1 ? "room" : "rooms"}` : "No rooms yet"}
                {" · "}
                {assetCount > 0 ? `${assetCount} ${assetCount === 1 ? "item" : "items"}` : "no items yet"}. Add the rest whenever you like; nothing here is required up front.
              </p>
            </div>
            <div className="text-sm text-ink-2 flex flex-col gap-2 rounded-xl bg-surface-2 p-4">
              <p className="font-semibold text-ink">How it fits together</p>
              <p>Rooms hold systems and appliances. Each appliance keeps its own manuals, receipts, warranty and maintenance history, so a filter change or a service call lands in one place.</p>
            </div>
            <div className="flex flex-wrap gap-3">
              <ButtonLink href="/home" size="lg">
                Go to your dashboard
              </ButtonLink>
              <ButtonLink href="/preparedness" size="lg" variant="secondary">
                Add shutoff locations
              </ButtonLink>
            </div>
          </section>
        )}

        {step !== "done" && step !== "property" && (
          <p className="text-sm text-ink-3 text-center">
            <Link href="/onboarding?step=done" className="font-semibold text-brand">
              Skip the rest for now
            </Link>
          </p>
        )}
      </div>
    </main>
  );
}
