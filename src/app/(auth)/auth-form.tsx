"use client";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useState, type FormEvent } from "react";
import { Loader2 } from "lucide-react";
import { authClient } from "@/core/auth/client";
import { Button } from "@/components/ui/button";
import { Field, FormMessage, Input } from "@/components/ui/field";
import { safeNext } from "@/lib/safe-next";

export function AuthForm({ mode, next, intro }: { mode: "sign-in" | "sign-up"; next?: string; intro?: string }) {
  const target = safeNext(next);
  const carry = target ? `?next=${encodeURIComponent(target)}` : "";
  const router = useRouter();
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    const fd = new FormData(e.currentTarget);
    const email = String(fd.get("email") ?? "").trim().toLowerCase();
    const password = String(fd.get("password") ?? "");
    const name = String(fd.get("name") ?? "").trim();
    if (!email || !password || (mode === "sign-up" && !name)) {
      setError("Please fill in every field.");
      return;
    }
    if (mode === "sign-up" && password.length < 10) {
      setError("Use a password of at least 10 characters.");
      return;
    }
    setPending(true);
    const result =
      mode === "sign-up"
        ? await authClient.signUp.email({ email, password, name })
        : await authClient.signIn.email({ email, password });
    setPending(false);
    if (result.error) {
      const msg = result.error.message ?? "That did not work.";
      setError(
        /invalid|incorrect|not found/i.test(msg)
          ? "Email or password is not right."
          : /exists|already/i.test(msg)
            ? "An account with that email already exists. Try signing in."
            : msg,
      );
      return;
    }
    router.push(target ?? (mode === "sign-up" ? "/onboarding" : "/home"));
    router.refresh();
  }

  return (
    <form onSubmit={onSubmit} className="card p-5 sm:p-6 flex flex-col gap-4" noValidate>
      <div>
        <h1 className="font-display text-2xl font-semibold">{mode === "sign-up" ? "Create your account" : "Welcome back"}</h1>
        <p className="text-sm text-ink-2 mt-1">
          {intro ?? (mode === "sign-up" ? "Takes a minute. No credit card, no sample data." : "Sign in to your Home Base.")}
        </p>
      </div>
      <FormMessage message={error ?? undefined} />
      {mode === "sign-up" && (
        <Field label="Your name" htmlFor="name">
          <Input id="name" name="name" autoComplete="name" required />
        </Field>
      )}
      <Field label="Email" htmlFor="email">
        <Input id="email" name="email" type="email" inputMode="email" autoComplete="email" autoCapitalize="none" required />
      </Field>
      <Field label="Password" htmlFor="password" hint={mode === "sign-up" ? "At least 10 characters. A passphrase works well." : undefined}>
        <Input id="password" name="password" type="password" autoComplete={mode === "sign-up" ? "new-password" : "current-password"} required minLength={mode === "sign-up" ? 10 : 1} />
      </Field>
      {mode === "sign-in" && (
        <Link href="/forgot-password" className="text-sm font-semibold text-brand -mt-2 w-fit">
          Forgot your password?
        </Link>
      )}
      <Button type="submit" size="lg" disabled={pending} className="mt-1">
        {pending ? <Loader2 className="size-4 animate-spin" aria-hidden /> : null}
        {mode === "sign-up" ? "Create account" : "Sign in"}
      </Button>
      <p className="text-sm text-ink-2 text-center">
        {mode === "sign-up" ? (
          <>
            Already have an account?{" "}
            <Link href={`/sign-in${carry}`} className="font-semibold text-brand">
              Sign in
            </Link>
          </>
        ) : (
          <>
            New here?{" "}
            <Link href={`/sign-up${carry}`} className="font-semibold text-brand">
              Create an account
            </Link>
          </>
        )}
      </p>
    </form>
  );
}
