"use client";
import Link from "next/link";
import { useState, type FormEvent } from "react";
import { Loader2 } from "lucide-react";
import { authClient } from "@/core/auth/client";
import { Button } from "@/components/ui/button";
import { Field, FormMessage, Input } from "@/components/ui/field";

export function ForgotPasswordForm() {
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [sentTo, setSentTo] = useState<string | null>(null);

  async function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    const email = String(new FormData(e.currentTarget).get("email") ?? "").trim().toLowerCase();
    if (!email) {
      setError("Enter the email you signed up with.");
      return;
    }
    setPending(true);
    const result = await authClient.requestPasswordReset({ email, redirectTo: "/reset-password" });
    setPending(false);
    if (result.error) {
      setError(/too many/i.test(result.error.message ?? "") ? "Too many requests. Wait a few minutes and try again." : "That did not work. Please try again.");
      return;
    }
    setSentTo(email);
  }

  if (sentTo) {
    return (
      <div className="card p-5 sm:p-6 flex flex-col gap-3">
        <h1 className="font-display text-2xl font-semibold">Check your email</h1>
        <p className="text-sm text-ink-2">
          If an account exists for <strong className="text-ink">{sentTo}</strong>, a link to choose a new password is on its way. It expires in an hour.
        </p>
        <p className="text-sm text-ink-2">Nothing after a few minutes? Check spam, or make sure that is the address you signed up with.</p>
        <Link href="/sign-in" className="text-sm font-semibold text-brand w-fit mt-1">
          Back to sign in
        </Link>
      </div>
    );
  }

  return (
    <form onSubmit={onSubmit} className="card p-5 sm:p-6 flex flex-col gap-4" noValidate>
      <div>
        <h1 className="font-display text-2xl font-semibold">Forgot your password?</h1>
        <p className="text-sm text-ink-2 mt-1">We will email you a link to choose a new one.</p>
      </div>
      <FormMessage message={error ?? undefined} />
      <Field label="Email" htmlFor="email">
        <Input id="email" name="email" type="email" inputMode="email" autoComplete="email" autoCapitalize="none" required />
      </Field>
      <Button type="submit" size="lg" disabled={pending}>
        {pending ? <Loader2 className="size-4 animate-spin" aria-hidden /> : null}
        Send reset link
      </Button>
      <p className="text-sm text-ink-2 text-center">
        Remembered it?{" "}
        <Link href="/sign-in" className="font-semibold text-brand">
          Sign in
        </Link>
      </p>
    </form>
  );
}
