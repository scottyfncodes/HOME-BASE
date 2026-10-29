import Link from "next/link";
import { redirect } from "next/navigation";
import { getSessionOrNull } from "@/core/auth/session";
import { setupProblems } from "@/core/env";
import { ButtonLink } from "@/components/ui/button";
import { Logo } from "@/components/layout/logo";
import { ClearOfflinePages } from "@/components/pwa/service-worker";

export const dynamic = "force-dynamic";

export default async function LandingPage() {
  const problems = setupProblems().filter((p) => p.fatal);
  if (problems.length > 0) {
    return (
      <main className="min-h-dvh flex items-center justify-center p-6">
        <div className="card max-w-lg p-6 flex flex-col gap-4">
          <Logo className="size-10" />
          <h1 className="font-display text-2xl font-semibold">Home Base needs setup</h1>
          <p className="text-ink-2">This deployment is missing required configuration. Nothing is broken; it just has not been connected yet.</p>
          <ul className="flex flex-col gap-2 text-sm">
            {problems.map((p) => (
              <li key={p.code} className="rounded-xl bg-warn-soft text-warn px-3 py-2">
                <span className="font-mono font-semibold">{p.code}</span>: {p.message}
              </li>
            ))}
          </ul>
          <p className="text-sm text-ink-3">See README.md → Deployment for the exact steps.</p>
        </div>
      </main>
    );
  }
  const session = await getSessionOrNull();
  if (session) redirect("/home");

  const features = [
    { title: "Maintenance that remembers", body: "Recurring tasks with a real history, due on your local date and in your calendar." },
    { title: "One record per thing", body: "Appliances and systems link to their manuals, receipts, and service history." },
    { title: "Records you can find", body: "Manuals, warranties, inspections, permits. Searchable, attached to what they describe." },
    { title: "Ready when it matters", body: "Shutoff locations, panel notes, and emergency contacts a thumb-tap away, even without a signal." },
    { title: "A real vault", body: "Deeds, passports and wills: encrypted at rest, re-authenticate to open." },
    { title: "Private by default", body: "Share it with the people you live with. Export it or delete it any time." },
  ];

  return (
    <main className="min-h-dvh">
      <div className="max-w-5xl mx-auto px-5 sm:px-8 py-6 sm:py-10 flex flex-col gap-12">
        <header className="flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <Logo className="size-9" />
            <span className="font-display font-semibold text-xl">Home Base</span>
          </div>
          <nav className="flex items-center gap-2">
            <Link href="/sign-in" className="h-10 px-3 inline-flex items-center text-sm font-semibold text-ink-2 hover:text-ink">
              Sign in
            </Link>
            <ButtonLink href="/sign-up" size="sm">
              Get started
            </ButtonLink>
          </nav>
        </header>

        <section className="flex flex-col gap-6 max-w-2xl pt-4 sm:pt-10">
          <p className="text-xs font-semibold uppercase tracking-widest text-accent">by HaveAnApp</p>
          <h1 className="font-display text-4xl sm:text-6xl font-semibold leading-[1.05] tracking-tight text-balance">
            The operating system for your home.
          </h1>
          <p className="text-lg text-ink-2 max-w-prose">
            One organized place for everything that comes with owning a home: what you have, what it needs, what it cost, and what to do when something goes wrong.
          </p>
          <div className="flex flex-wrap gap-3">
            <ButtonLink href="/sign-up" size="lg">
              Create your Home Base
            </ButtonLink>
            <ButtonLink href="/sign-in" size="lg" variant="secondary">
              I already have an account
            </ButtonLink>
          </div>
        </section>

        <dl className="grid grid-cols-1 sm:grid-cols-2 gap-x-10 border-t border-line">
          {features.map((f) => (
            <div key={f.title} className="border-b border-line py-5 flex flex-col gap-1.5">
              <dt className="font-display text-lg font-semibold leading-snug">{f.title}</dt>
              <dd className="text-[15px] text-ink-2 max-w-prose">{f.body}</dd>
            </div>
          ))}
        </dl>

        <footer className="text-sm text-ink-3 pb-6">Home Base is in early access. Your data is stored privately and never used for anything else.</footer>
      </div>
      <ClearOfflinePages />
    </main>
  );
}
