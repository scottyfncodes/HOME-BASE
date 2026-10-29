import Link from "next/link";
import { ResetPasswordForm } from "./reset-form";

export const metadata = { title: "Choose a new password" };
export const dynamic = "force-dynamic";

export default async function ResetPasswordPage({ searchParams }: { searchParams: Promise<{ token?: string; error?: string }> }) {
  const { token, error } = await searchParams;
  if (!token || error) {
    return (
      <div className="card p-5 sm:p-6 flex flex-col gap-3">
        <h1 className="font-display text-2xl font-semibold">This link has expired</h1>
        <p className="text-sm text-ink-2">Reset links work once and last an hour. Ask for a fresh one and use the newest email.</p>
        <Link href="/forgot-password" className="text-sm font-semibold text-brand w-fit">
          Send a new link
        </Link>
      </div>
    );
  }
  return <ResetPasswordForm token={token} />;
}
