import { Download, LogOut, Users } from "lucide-react";
import Link from "next/link";
import { requireCtx } from "@/core/auth/session";
import { getHousehold, getPrimaryProperty, listMembers } from "@/core/services/household";
import { isVaultAvailable } from "@/core/services/vault";
import { env } from "@/core/env";
import { Card, PageHeader, Pill, Section } from "@/components/ui/page";
import { SignOutButton } from "@/components/layout/sign-out-button";
import { DeleteAccountForm, RenameHouseholdForm } from "./forms";

export const metadata = { title: "Settings" };

export default async function SettingsPage() {
  const ctx = await requireCtx();
  const [household, members, property] = await Promise.all([getHousehold(ctx), listMembers(ctx), getPrimaryProperty(ctx)]);
  return (
    <>
      <PageHeader title="Settings" description={`Signed in as ${ctx.user.name} (${ctx.user.email}).`} />
      <div className="flex flex-col gap-6">
        {!property && (
          <div className="rounded-xl bg-warn-soft text-warn px-4 py-3 text-sm">
            Your home is not set up yet.{" "}
            <Link href="/onboarding" className="font-semibold underline">
              Finish onboarding
            </Link>{" "}
            to unlock the dashboard, inventory and maintenance.
          </div>
        )}
        <Section title="Household">
          <Card className="p-4 sm:p-5 flex flex-col gap-4">
            <RenameHouseholdForm name={household.name} />
            <div>
              <div className="text-xs font-semibold uppercase tracking-wider text-ink-3 mb-2">Members</div>
              <ul className="flex flex-col divide-y divide-line">
                {members.map((m) => (
                  <li key={m.userId} className="flex items-center gap-3 py-2">
                    <div className="size-9 rounded-full bg-surface-2 flex items-center justify-center text-ink-2">
                      <Users className="size-4" aria-hidden />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="font-medium truncate">{m.name}</div>
                      <div className="text-sm text-ink-2 truncate">{m.email}</div>
                    </div>
                    <Pill tone={m.role === "owner" ? "brand" : "neutral"}>{m.role}</Pill>
                  </li>
                ))}
              </ul>
              <p className="text-sm text-ink-3 mt-2">Inviting additional household members is on the roadmap. The data model already supports it.</p>
            </div>
          </Card>
        </Section>

        <Section title="Your data">
          <Card className="p-4 sm:p-5 flex flex-col gap-3">
            <p className="text-sm text-ink-2">Download everything in your household as JSON: property, rooms, items, maintenance history, projects, expenses, documents and preparedness records. Files are listed with download links that work while you are signed in. Vault documents are included only while the Vault is unlocked.</p>
            <div>
              <a href="/api/export" className="inline-flex items-center gap-2 h-11 px-4 rounded-xl bg-surface border border-line-strong font-semibold text-[15px] hover:bg-surface-2">
                <Download className="size-4" aria-hidden /> Export my data
              </a>
            </div>
          </Card>
        </Section>

        <Section title="Vault">
          <Card className="p-4 sm:p-5 text-sm text-ink-2 flex flex-col gap-1">
            <p>
              Status: <span className={isVaultAvailable() ? "text-ok font-semibold" : "text-warn font-semibold"}>{isVaultAvailable() ? "available" : "not configured on this server"}</span>
            </p>
            <p>Vault files are encrypted at rest with a server-held key and require your password again before they can be opened. This is not end-to-end encryption: the server can decrypt files to show them to you. See the README for details and limits.</p>
            <p>Upload limit: {Math.round(env.maxUploadBytes / 1024 / 1024)} MB per file.</p>
          </Card>
        </Section>

        <Section title="Account">
          <Card className="p-4 sm:p-5 flex flex-col gap-4">
            <SignOutButton variant="secondary" className="w-fit">
              <LogOut className="size-4" aria-hidden /> Sign out
            </SignOutButton>
            <div className="border-t border-line pt-4">
              <h3 className="font-semibold text-danger mb-1">Delete account</h3>
              <p className="text-sm text-ink-2 mb-3">
                {members.length <= 1
                  ? "This deletes your account and your entire household: every record and every file, immediately and permanently. Export first if you want a copy."
                  : "This deletes your account and removes you from the household. The household's records stay with the other members."}
              </p>
              <DeleteAccountForm />
            </div>
          </Card>
        </Section>
      </div>
    </>
  );
}
