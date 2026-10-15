import type { ComponentProps, ReactNode } from "react";
import { cn } from "@/lib/cn";

const control =
  "w-full rounded-xl border border-line-strong bg-surface px-3.5 text-[15px] text-ink placeholder:text-ink-3 focus:border-brand focus:outline-none focus:ring-2 focus:ring-brand/20 disabled:bg-surface-2";

export function Input({ className, invalid, ...props }: ComponentProps<"input"> & { invalid?: boolean }) {
  return <input className={cn(control, "h-11", invalid && "border-danger", className)} aria-invalid={invalid || undefined} {...props} />;
}

export function Textarea({ className, invalid, ...props }: ComponentProps<"textarea"> & { invalid?: boolean }) {
  return <textarea className={cn(control, "py-2.5 min-h-24", invalid && "border-danger", className)} aria-invalid={invalid || undefined} {...props} />;
}

export function Select({ className, invalid, children, ...props }: ComponentProps<"select"> & { invalid?: boolean }) {
  return (
    <select className={cn(control, "h-11 appearance-none bg-no-repeat pr-9", invalid && "border-danger", className)} aria-invalid={invalid || undefined} style={{ backgroundImage: "url(\"data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='16' height='16' viewBox='0 0 24 24' fill='none' stroke='%238a827a' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'><path d='m6 9 6 6 6-6'/></svg>\")", backgroundPosition: "right 12px center" }} {...props}>
      {children}
    </select>
  );
}

export function Field({
  label,
  htmlFor,
  hint,
  error,
  children,
  optional,
  className,
}: {
  label: string;
  htmlFor?: string;
  hint?: string;
  error?: string;
  optional?: boolean;
  children: ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("flex flex-col gap-1.5", className)}>
      <label htmlFor={htmlFor} className="text-sm font-semibold text-ink-2">
        {label}
        {optional && <span className="ml-1.5 font-normal text-ink-3">optional</span>}
      </label>
      {children}
      {error ? (
        <p className="text-sm text-danger" role="alert">
          {error}
        </p>
      ) : hint ? (
        <p className="text-sm text-ink-3">{hint}</p>
      ) : null}
    </div>
  );
}

export function FormMessage({ message, ok }: { message?: string; ok?: boolean }) {
  if (!message) return null;
  return (
    <div
      role="alert"
      className={cn("rounded-xl px-3.5 py-2.5 text-sm", ok ? "bg-ok-soft text-ok" : "bg-danger-soft text-danger")}
    >
      {message}
    </div>
  );
}

export function FormSection({ title, description, children }: { title: string; description?: string; children: ReactNode }) {
  return (
    <section className="card p-4 sm:p-5 flex flex-col gap-4">
      <div>
        <h2 className="text-base font-semibold">{title}</h2>
        {description && <p className="text-sm text-ink-2 mt-0.5">{description}</p>}
      </div>
      {children}
    </section>
  );
}

export function FormGrid({ children }: { children: ReactNode }) {
  return <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">{children}</div>;
}

export function FormActions({ children }: { children: ReactNode }) {
  return <div className="flex flex-wrap items-center gap-3 justify-end pt-1">{children}</div>;
}
