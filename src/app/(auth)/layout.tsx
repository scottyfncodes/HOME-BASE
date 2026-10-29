import Link from "next/link";
import { Logo } from "@/components/layout/logo";
import { ClearOfflinePages } from "@/components/pwa/service-worker";

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <main className="min-h-dvh flex flex-col items-center justify-center p-5 safe-top safe-bottom">
      <Link href="/" className="flex items-center gap-2.5 mb-8">
        <Logo className="size-10" />
        <span className="font-display font-semibold text-2xl">Home Base</span>
      </Link>
      <div className="w-full max-w-sm">{children}</div>
      <ClearOfflinePages />
    </main>
  );
}
