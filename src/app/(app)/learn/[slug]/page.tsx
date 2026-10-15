import { notFound } from "next/navigation";
import { AlertTriangle, PhoneCall, Plus } from "lucide-react";
import { getGuide, TASK_SUGGESTIONS } from "@/features/learn/guides";
import { Card, PageHeader, Section } from "@/components/ui/page";
import { ButtonLink } from "@/components/ui/button";

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  return { title: getGuide(slug)?.title ?? "Guide" };
}

export default async function GuidePage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const guide = getGuide(slug);
  if (!guide) notFound();
  const suggestion = TASK_SUGGESTIONS.find((s) => s.guideSlug === guide.slug);
  return (
    <>
      <PageHeader back={{ href: "/learn", label: "Learn" }} eyebrow="Guide" title={guide.title} description={guide.summary} />
      <div className="flex flex-col gap-6 max-w-prose">
        {guide.suggestedFrequency && (
          <Card className="p-4 flex flex-wrap items-center justify-between gap-3">
            <div>
              <div className="text-xs font-semibold uppercase tracking-wider text-ink-3">How often</div>
              <div className="text-[15px]">{guide.suggestedFrequency}</div>
            </div>
            {suggestion && (
              <ButtonLink href={`/maintenance/new?title=${encodeURIComponent(suggestion.title)}&recurrence=${suggestion.recurrence}&guide=${guide.slug}`} size="sm" variant="secondary">
                <Plus className="size-4" aria-hidden /> Schedule it
              </ButtonLink>
            )}
          </Card>
        )}
        {guide.sections.map((s) => (
          <Section key={s.heading} title={s.heading}>
            {s.body && <p className="text-[15px] leading-relaxed text-ink">{s.body}</p>}
            {s.items && (
              <ol className="list-decimal pl-5 flex flex-col gap-2 text-[15px] leading-relaxed">
                {s.items.map((i) => (
                  <li key={i}>{i}</li>
                ))}
              </ol>
            )}
          </Section>
        ))}
        {guide.safety.length > 0 && (
          <Card className="p-4 border-warn/40 bg-warn-soft/40">
            <div className="flex items-center gap-2 font-semibold text-warn mb-2">
              <AlertTriangle className="size-4" aria-hidden /> Safety
            </div>
            <ul className="list-disc pl-5 flex flex-col gap-1 text-[15px]">
              {guide.safety.map((s) => (
                <li key={s}>{s}</li>
              ))}
            </ul>
          </Card>
        )}
        {guide.callAPro.length > 0 && (
          <Card className="p-4">
            <div className="flex items-center gap-2 font-semibold mb-2">
              <PhoneCall className="size-4 text-brand" aria-hidden /> Call a professional for
            </div>
            <ul className="list-disc pl-5 flex flex-col gap-1 text-[15px]">
              {guide.callAPro.map((s) => (
                <li key={s}>{s}</li>
              ))}
            </ul>
          </Card>
        )}
        <p className="text-xs text-ink-3">General guidance only. Follow your equipment&apos;s manual and local codes.</p>
      </div>
    </>
  );
}
