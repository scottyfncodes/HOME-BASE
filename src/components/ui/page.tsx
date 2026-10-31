import Link from "next/link";
import { ChevronLeft } from "lucide-react";
import type { ReactNode } from "react";
import { cn } from "@/lib/cn";

export function PageHeader({
  title,
  eyebrow,
  description,
  actions,
  back,
  className,
}: {
  title: ReactNode;
  eyebrow?: ReactNode;
  description?: ReactNode;
  actions?: ReactNode;
  back?: { href: string; label: string };
  className?: string;
}) {
  return (
    <header className={cn("flex flex-col gap-3 mb-6", className)}>
      {back && (
        <Link href={back.href} className="inline-flex items-center gap-1 h-6 text-sm font-semibold text-brand -ml-1 w-fit">
          <ChevronLeft className="size-4" aria-hidden /> {back.label}
        </Link>
      )}
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          {eyebrow && <div className="eyebrow mb-1.5">{eyebrow}</div>}
          <h1 className="font-display text-[28px] sm:text-[32px] leading-[1.15] font-semibold tracking-tight">{title}</h1>
          {description && <p className="text-ink-2 mt-2 text-[15px] leading-snug max-w-prose">{description}</p>}
        </div>
        {actions && <div className="flex flex-wrap items-center gap-2 shrink-0">{actions}</div>}
      </div>
    </header>
  );
}

export function Section({
  title,
  action,
  children,
  className,
  description,
}: {
  title?: ReactNode;
  action?: ReactNode;
  description?: ReactNode;
  children: ReactNode;
  className?: string;
}) {
  return (
    <section className={cn("flex flex-col gap-3", className)}>
      {(title || action) && (
        <div className="flex items-baseline justify-between gap-3">
          <div className="min-w-0">
            {title && <h2 className="text-lg leading-7 font-semibold tracking-tight">{title}</h2>}
            {description && <p className="text-sm text-ink-2 mt-0.5">{description}</p>}
          </div>
          {action}
        </div>
      )}
      {children}
    </section>
  );
}

export function Card({ children, className, as: Tag = "div" }: { children: ReactNode; className?: string; as?: "div" | "section" | "article" }) {
  return <Tag className={cn("card", className)}>{children}</Tag>;
}

export function EmptyState({
  icon,
  title,
  description,
  action,
  compact,
}: {
  icon?: ReactNode;
  title: string;
  description?: ReactNode;
  action?: ReactNode;
  compact?: boolean;
}) {
  return (
    <div className={cn("card flex flex-col items-center text-center gap-3", compact ? "p-6" : "p-8 sm:p-10")}>
      {icon && <div className="size-12 rounded-2xl bg-brand-soft text-brand flex items-center justify-center [&>svg]:size-6">{icon}</div>}
      <div className="flex flex-col gap-1 max-w-sm">
        <h3 className="font-semibold text-base leading-snug">{title}</h3>
        {description && <p className="text-sm leading-relaxed text-ink-2">{description}</p>}
      </div>
      {action && <div className="flex flex-wrap justify-center gap-2 pt-1">{action}</div>}
    </div>
  );
}

export function Pill({ children, tone = "neutral", className }: { children: ReactNode; tone?: "neutral" | "brand" | "accent" | "danger" | "warn" | "ok" | "info"; className?: string }) {
  const tones = {
    neutral: "bg-surface-2 text-ink-2",
    brand: "bg-brand-soft text-brand",
    accent: "bg-accent-soft text-accent",
    danger: "bg-danger-soft text-danger",
    warn: "bg-warn-soft text-warn",
    ok: "bg-ok-soft text-ok",
    info: "bg-info-soft text-info",
  } as const;
  return <span className={cn("inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-semibold whitespace-nowrap", tones[tone], className)}>{children}</span>;
}

/** A tappable list row. Use inside a `card divide-y` container. */
export function Row({
  href,
  title,
  subtitle,
  meta,
  icon,
  trailing,
}: {
  href?: string;
  title: ReactNode;
  subtitle?: ReactNode;
  meta?: ReactNode;
  icon?: ReactNode;
  trailing?: ReactNode;
}) {
  const body = (
    <>
      {icon && <div className="size-10 shrink-0 rounded-xl bg-surface-2 text-ink-2 flex items-center justify-center [&>svg]:size-5">{icon}</div>}
      <div className="min-w-0 flex-1">
        <div className="font-medium text-[15px] leading-snug truncate">{title}</div>
        {subtitle && <div className="text-sm text-ink-2 truncate mt-0.5">{subtitle}</div>}
      </div>
      {meta && <div className="shrink-0 text-sm text-ink-2 text-right">{meta}</div>}
    </>
  );
  const inner = (
    <>
      {body}
      {trailing}
    </>
  );
  const cls = "flex items-center gap-3 px-4 py-3 min-h-14";
  if (href) {
    const hover = "hover:bg-surface-2/70 active:bg-surface-2 transition-colors";
    // A trailing control (e.g. a call button) is often a link itself; links
    // cannot nest, so it sits beside the row's link rather than inside it.
    if (trailing) {
      return (
        <div className={cn("flex items-center pr-4", hover)}>
          <Link href={href} className={cn(cls, "flex-1 min-w-0 pr-0")}>
            {body}
          </Link>
          {trailing}
        </div>
      );
    }
    return (
      <Link href={href} className={cn(cls, hover)}>
        {inner}
      </Link>
    );
  }
  return <div className={cls}>{inner}</div>;
}

export function Stat({ label, value, tone, href }: { label: string; value: ReactNode; tone?: "danger" | "warn" | "brand" | "neutral"; href?: string }) {
  const color = tone === "danger" ? "text-danger" : tone === "warn" ? "text-warn" : tone === "brand" ? "text-brand" : "text-ink";
  const body = (
    <>
      <div className={cn("figure text-2xl", color)}>{value}</div>
      <div className="eyebrow mt-2">{label}</div>
    </>
  );
  if (href) {
    return (
      <Link href={href} className="card p-4 hover:bg-surface-2/60 transition-colors">
        {body}
      </Link>
    );
  }
  return <div className="card p-4">{body}</div>;
}

export function DescriptionList({ items }: { items: Array<{ label: string; value: ReactNode } | null | false | undefined | "" | 0> }) {
  const rows = items.filter(Boolean) as Array<{ label: string; value: ReactNode }>;
  if (rows.length === 0) return null;
  return (
    <dl className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-3">
      {rows.map((r) => (
        <div key={r.label} className="min-w-0">
          <dt className="eyebrow">{r.label}</dt>
          <dd className="text-[15px] leading-snug mt-1 break-words">{r.value}</dd>
        </div>
      ))}
    </dl>
  );
}

export function Tabs({ tabs, current }: { tabs: Array<{ href: string; label: string; count?: number }>; current: string }) {
  return (
    <nav className="flex gap-1 overflow-x-auto -mx-4 px-4 sm:mx-0 sm:px-0 pb-1 [scrollbar-width:none]" aria-label="Views">
      {tabs.map((t) => {
        const active = t.href === current;
        return (
          <Link
            key={t.href}
            href={t.href}
            aria-current={active ? "page" : undefined}
            className={cn(
              "h-9 px-3.5 rounded-full text-sm font-semibold whitespace-nowrap inline-flex items-center gap-1.5 transition-colors",
              active ? "bg-ink text-bg" : "bg-surface border border-line text-ink-2 hover:bg-surface-2",
            )}
          >
            {t.label}
            {t.count != null && t.count > 0 && <span className={cn("text-xs tabular-nums leading-5 min-w-5 text-center rounded-full px-1.5", active ? "bg-bg/20" : "bg-surface-2")}>{t.count}</span>}
          </Link>
        );
      })}
    </nav>
  );
}
