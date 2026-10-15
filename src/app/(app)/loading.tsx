export default function Loading() {
  return (
    <div className="flex flex-col gap-4 animate-pulse" aria-busy="true" aria-label="Loading">
      <div className="h-8 w-48 rounded-lg bg-surface-2" />
      <div className="h-24 rounded-2xl bg-surface-2" />
      <div className="h-40 rounded-2xl bg-surface-2" />
    </div>
  );
}
