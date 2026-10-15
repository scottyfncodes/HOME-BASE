"use client";
import { useActionState, type ReactNode } from "react";
import type { ActionState } from "@/lib/actions";

/**
 * Wires a server action to a form and exposes its state to children.
 * Children receive the latest ActionState so they can show field errors.
 */
export function ActionForm({
  action,
  children,
  className,
  initial = {},
}: {
  action: (prev: ActionState, formData: FormData) => Promise<ActionState>;
  children: (state: ActionState) => ReactNode;
  className?: string;
  initial?: ActionState;
}) {
  const [state, formAction] = useActionState(action, initial);
  return (
    <form action={formAction} className={className ?? "flex flex-col gap-4"} noValidate>
      {children(state)}
    </form>
  );
}
