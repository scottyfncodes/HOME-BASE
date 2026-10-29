"use client";
import Link from "next/link";
import { useState, type FormEvent } from "react";
import { Loader2 } from "lucide-react";
import { authClient } from "@/core/auth/client";
import { Button } from "@/components/ui/button";
import { Field, FormMessage, Input } from "@/components/ui/field";

export function ResetPasswordForm({ token }: { token: string }) {
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);

  async function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    const fd = new FormData(e.currentTarget);
    const password = String(fd.get("password") ?? "");
    const confirm = String(fd.get("confirm") ?? "");
    if (password.length < 10) {
      setError("Use a password of at least 10 characters.");
      return;
    }
    if (password !== confirm) {
      setError("The two passwords do not match.");
      return;
    }
    setPending(true);
    const result = await authClient.resetPassword({ newPassword: password, token });
    setPending(false);
    if (result.error) {
      setError(/token/i.test(result.error.message ?? "") ? "This link has expired or was already used. Ask for a new one." : (result.error.message ?? "That did not work."));
      return;
    }
    setDone(true);
  }

  if (done) {
    return (
      <div className="card p-5 sm:p-6 flex flex-col gap-3">
        <h1 className="font-display text-2xl font-semibold">Password changed</h1>
        <p className="text-sm text-ink-2">You have been signed out on every device. Sign in with your new password.</p>
        <Link href="/sign-in" className="text-sm font-semibold text-brand w-fit">
          Sign in
        </Link>
      </div>
    );
  }

  return (
    <form onSubmit={onSubmit} className="card p-5 sm:p-6 flex flex-col gap-4" noValidate>
      <div>
        <h1 className="font-display text-2xl font-semibold">Choose a new password</h1>
        <p className="text-sm text-ink-2 mt-1">This also signs you out everywhere else.</p>
      </div>
      <FormMessage message={error ?? undefined} />
      <Field label="New password" htmlFor="password" hint="At least 10 characters. A passphrase works well.">
        <Input id="password" name="password" type="password" autoComplete="new-password" required minLength={10} />
      </Field>
      <Field label="Type it again" htmlFor="confirm">
        <Input id="confirm" name="confirm" type="password" autoComplete="new-password" required minLength={10} />
      </Field>
      <Button type="submit" size="lg" disabled={pending}>
        {pending ? <Loader2 className="size-4 animate-spin" aria-hidden /> : null}
        Save new password
      </Button>
      {error && /expired/.test(error) && (
        <Link href="/forgot-password" className="text-sm font-semibold text-brand text-center">
          Send a new link
        </Link>
      )}
    </form>
  );
}
