import Link from "next/link";
import { requirePropertyCtx } from "@/core/auth/session";
import { getSpending } from "@/core/services/spending";
import { formatDate, todayIn } from "@/core/domain/dates";
import { formatCents } from "@/core/domain/money";
import { ButtonLink } from "@/components/ui/button";
import { Card, EmptyState, PageHeader, Section } from "@/components/ui/page";
import { cn } from "@/lib/cn";

export const metadata = { title: "Spending" };

const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

export default async function SpendingPage({ searchParams }: { searchParams: Promise<{ year?: string }> }) {
  const ctx = await requirePropertyCtx();
  const thisYear = Number(todayIn(ctx.timezone).slice(0, 4));
  const asked = Number((await searchParams).year);
  const year = Number.isInteger(asked) && asked > 1900 && asked <= thisYear + 1 ? asked : thisYear;
  const s = await getSpending(ctx, year);
  const years = [...new Set([thisYear, ...s.years])].sort((a, b) => b - a);
  const peak = Math.max(...s.byMonth, 1);

  return (
    <>
      <PageHeader back={{ href: "/my-home", label: "My Home" }} title="Spending" description="What keeping up this home cost: maintenance with a cost recorded, plus project and other expenses. Purchase prices of items are not counted." />

      {years.length > 1 && (
        <nav aria-label="Year" className="flex flex-wrap gap-2 mb-6">
          {years.map((y) => (
            <Link
              key={y}
              href={y === thisYear ? "/my-home/spending" : `/my-home/spending?year=${y}`}
              aria-current={y === year ? "page" : undefined}
              className={cn("h-9 px-3.5 rounded-full text-sm font-semibold inline-flex items-center border", y === year ? "bg-brand text-brand-ink border-brand" : "bg-surface border-line-strong text-ink-2 hover:bg-surface-2")}
            >
              {y}
            </Link>
          ))}
        </nav>
      )}

      {s.total === 0 ? (
        <EmptyState
          title={`Nothing recorded for ${year}`}
          description="Add a cost when you mark maintenance done, or log expenses on a project, and they add up here."
          action={
            <ButtonLink href="/maintenance" variant="secondary" size="sm">
              Go to maintenance
            </ButtonLink>
          }
        />
      ) : (
        <div className="flex flex-col gap-6">
          <Card className="p-4 sm:p-5 flex flex-col gap-5">
            <div>
              <div className="eyebrow">{year} total</div>
              <div className="font-display text-[40px] leading-tight font-semibold tracking-tight">{formatCents(s.total, { compact: true })}</div>
              <dl className="mt-2 flex flex-wrap gap-x-6 gap-y-1 text-sm">
                <Split label="Maintenance" cents={s.maintenance} />
                <Split label="Projects" cents={s.projects} />
                {s.other > 0 && <Split label="Other expenses" cents={s.other} />}
              </dl>
            </div>

            <figure>
              <figcaption className="text-sm font-semibold text-ink-2 mb-2">By month</figcaption>
              <div className="grid grid-cols-12 gap-[2px] sm:gap-1 items-end h-36 border-b border-line-strong" role="img" aria-label={`Spending by month in ${year}`}>
                {s.byMonth.map((c, i) => (
                  <div key={i} className="group relative h-full flex items-end" title={`${MONTHS[i]}: ${formatCents(c)}`}>
                    <div className="w-full rounded-t-[4px] bg-brand group-hover:bg-brand-strong" style={{ height: c > 0 ? `max(${(c / peak) * 100}%, 3px)` : 0 }} />
                    <span className="pointer-events-none absolute bottom-full left-1/2 -translate-x-1/2 mb-1 hidden group-hover:block whitespace-nowrap rounded-md bg-ink text-bg px-2 py-1 text-xs font-semibold z-10">
                      {MONTHS[i]} {formatCents(c, { compact: true })}
                    </span>
                  </div>
                ))}
              </div>
              <div className="grid grid-cols-12 gap-[2px] sm:gap-1 mt-1.5 text-[11px] text-ink-3 text-center">
                {MONTHS.map((m) => (
                  <span key={m}>{m.slice(0, 1)}<span className="hidden sm:inline">{m.slice(1)}</span></span>
                ))}
              </div>
              <details className="mt-3 text-sm">
                <summary className="cursor-pointer text-brand font-semibold w-fit">Show as a table</summary>
                <table className="mt-2 w-full max-w-xs">
                  <tbody>
                    {s.byMonth.map((c, i) => (
                      <tr key={i} className="border-b border-line last:border-0">
                        <th scope="row" className="text-left font-normal text-ink-2 py-1">{MONTHS[i]}</th>
                        <td className="text-right tabular-nums py-1">{formatCents(c)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </details>
            </figure>
          </Card>

          {(s.topAssets.length > 0 || s.topProjects.length > 0) && (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
              {s.topAssets.length > 0 && <TopList title="Costliest items" rows={s.topAssets.map((a) => ({ ...a, href: `/inventory/${a.id}` }))} />}
              {s.topProjects.length > 0 && <TopList title="Projects" rows={s.topProjects.map((p) => ({ ...p, href: `/projects/${p.id}` }))} />}
            </div>
          )}

          <Section title="Every entry" description={`${s.lines.length} in ${year}, newest first.`}>
            <Card className="divide-y divide-line overflow-hidden">
              {s.lines.map((l) => (
                <div key={`${l.kind}-${l.id}`} className="flex items-center gap-3 px-4 py-3 min-h-14">
                  <div className="min-w-0 flex-1">
                    <div className="font-medium text-[15px] leading-snug truncate">{l.title}</div>
                    <div className="text-sm text-ink-2 truncate mt-0.5">
                      {formatDate(l.on)} · {l.kind === "maintenance" ? "Maintenance" : l.projectName ?? "Expense"}
                      {l.assetName ? ` · ${l.assetName}` : ""}
                    </div>
                  </div>
                  <div className="shrink-0 text-[15px] font-semibold tabular-nums">{formatCents(l.cents)}</div>
                </div>
              ))}
            </Card>
          </Section>
        </div>
      )}
    </>
  );
}

function Split({ label, cents }: { label: string; cents: number }) {
  return (
    <div className="flex gap-1.5">
      <dt className="text-ink-2">{label}</dt>
      <dd className="font-semibold tabular-nums">{formatCents(cents, { compact: true })}</dd>
    </div>
  );
}

function TopList({ title, rows }: { title: string; rows: Array<{ id: string; name: string; cents: number; href: string }> }) {
  return (
    <Section title={title}>
      <Card className="divide-y divide-line overflow-hidden">
        {rows.map((r) => (
          <Link key={r.id} href={r.href} className="flex items-center gap-3 px-4 py-3 min-h-12 hover:bg-surface-2/70">
            <span className="flex-1 min-w-0 truncate text-[15px] font-medium">{r.name}</span>
            <span className="shrink-0 text-[15px] tabular-nums">{formatCents(r.cents, { compact: true })}</span>
          </Link>
        ))}
      </Card>
    </Section>
  );
}
