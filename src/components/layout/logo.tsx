export function Logo({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 64 64" className={className} aria-hidden>
      <rect width="64" height="64" rx="16" fill="var(--brand)" />
      <path d="M14 33 L32 17 L50 33" fill="none" stroke="var(--bg)" strokeWidth="4.5" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M20 30 V48 H44 V30" fill="none" stroke="var(--bg)" strokeWidth="4.5" strokeLinecap="round" strokeLinejoin="round" />
      <rect x="28" y="38" width="8" height="10" rx="1.5" fill="var(--accent)" />
    </svg>
  );
}
