import { ButtonLink } from "@/components/ui/button";

export default function NotFound() {
  return (
    <div className="card p-6 flex flex-col gap-3 max-w-lg">
      <h1 className="font-display text-xl font-semibold">Not found</h1>
      <p className="text-sm text-ink-2">That record does not exist or is not part of your household.</p>
      <div>
        <ButtonLink href="/home" variant="secondary">
          Back to Home
        </ButtonLink>
      </div>
    </div>
  );
}
