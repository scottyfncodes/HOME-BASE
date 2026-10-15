"use client";
import { useActionState, type ReactNode } from "react";
import type { ActionState } from "@/lib/actions";
import { SubmitButton } from "./submit-button";
import { FormMessage } from "./field";

/**
 * A one-button form for destructive actions. Uses the browser's confirm()
 * so there is a deliberate second step on every device.
 */
export function ConfirmForm({
  action,
  confirm,
  children,
  variant = "danger",
  size = "md",
  hidden,
  className,
}: {
  action: (prev: ActionState, formData: FormData) => Promise<ActionState>;
  confirm: string;
  children: ReactNode;
  variant?: "danger" | "secondary" | "ghost" | "primary";
  size?: "sm" | "md" | "lg";
  hidden?: Record<string, string>;
  className?: string;
}) {
  const [state, formAction] = useActionState(action, {});
  return (
    <form
      action={formAction}
      className={className}
      onSubmit={(e) => {
        if (!window.confirm(confirm)) e.preventDefault();
      }}
    >
      {hidden && Object.entries(hidden).map(([k, v]) => <input key={k} type="hidden" name={k} value={v} />)}
      <SubmitButton variant={variant} size={size} pendingText="Working…">
        {children}
      </SubmitButton>
      {state.message && !state.ok && (
        <div className="mt-2">
          <FormMessage message={state.message} />
        </div>
      )}
    </form>
  );
}
