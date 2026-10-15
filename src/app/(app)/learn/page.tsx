import { BookOpen } from "lucide-react";
import { Card, PageHeader, Row } from "@/components/ui/page";
import { GUIDES } from "@/features/learn/guides";

export const metadata = { title: "Learn" };

export default function LearnPage() {
  return (
    <>
      <PageHeader title="Learn" description="Short, practical guides for the things every homeowner runs into. Written to be conservative: when in doubt, they say call a pro." />
      <Card className="divide-y divide-line overflow-hidden">
        {GUIDES.map((g) => (
          <Row key={g.slug} href={`/learn/${g.slug}`} icon={<BookOpen />} title={g.title} subtitle={g.summary} />
        ))}
      </Card>
      <p className="text-xs text-ink-3 mt-4">
        Guidance is general. It never replaces your equipment&apos;s manual, local codes, or a licensed professional. Home Base does not invent specifications for your specific equipment.
      </p>
    </>
  );
}
