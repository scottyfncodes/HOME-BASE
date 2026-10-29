import { redirect } from "next/navigation";
import { getSessionOrNull } from "@/core/auth/session";
import { safeNext } from "@/lib/safe-next";
import { AuthForm } from "../auth-form";

export const metadata = { title: "Create account" };
export const dynamic = "force-dynamic";

export default async function SignUpPage({ searchParams }: { searchParams: Promise<{ next?: string }> }) {
  const next = safeNext((await searchParams).next);
  if (await getSessionOrNull()) redirect(next ?? "/home");
  return <AuthForm mode="sign-up" next={next} intro={next?.startsWith("/invite/") ? "Create an account to join the household." : undefined} />;
}
