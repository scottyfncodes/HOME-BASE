import { Download, LogOut, Users } from "lucide-react";
import { hasCalendarFeed } from "@/core/services/calendar";
import { getPreferences } from "@/core/services/digest";
import { listPendingInvites } from "@/core/services/invites";
import { emailConfigured } from "@/core/email/send";
import { formatDate } from "@/core/domain/dates";
import { ConfirmForm } from "@/components/ui/confirm-form";
import Link from "next/link";
import { requireCtx } from "@/core/auth/session";
import { getHousehold, getPrimaryProperty, listMembers } from "@/core/services/household";
import { isVaultAvailable } from "@/core/services/vault";
import { env } from "@/core/env";
import { Card, PageHeader, Pill, Section } from "@/components/ui/page";
import { SignOutButton } from "@/components/layout/sign-out-button";
import { CalendarFeedForm, DeleteAccountForm, DigestForm, InviteForm, RenameHouseholdForm } from "./forms";
import { deleteCalendarFeedAction, leaveHouseholdAction, removeMemberAction, revokeInviteAction, setMemberRoleAction } from "./actions";

export const metadata = { title: "Settings" };

export default async function SettingsPage() {
  const ctx = await requireCtx();
  const [household, members, property, invites, feed, prefs] = await Promise.all([getHousehold(ctx), listMembers(ctx), getPrimaryProperty(ctx), listPendingInvites(ctx), hasCalendarFeed(ctx), getPreferences(ctx)]);
  const isOwner = ctx.role === "owner";
  const emailReady = emailConfigured();
  const otherOwners = members.filter((m) => m.role === "owner" && m.userId !== ctx.userId).length;
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
          <Card className="p-4 sm:p-5 flex flex-col gap-5">
            {isOwner ? <RenameHouseholdForm name={household.name} /> : <p className="font-semibold">{household.name}</p>}
            <div>
              <div className="eyebrow mb-2">Members</div>
              <ul className="flex flex-col divide-y divide-line">
                {members.map((m) => (
                  <li key={m.userId} className="flex flex-wrap items-center gap-x-3 gap-y-2 py-2.5">
                    <div className="size-9 rounded-full bg-surface-2 flex items-center justify-center text-ink-2 shrink-0">
                      <Users className="size-4" aria-hidden />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="font-medium truncate">
                        {m.name}
                        {m.userId === ctx.userId && <span className="text-ink-3 font-normal"> (you)</span>}
                      </div>
                      <div className="text-sm text-ink-2 truncate">{m.email}</div>
                    </div>
                    <Pill tone={m.role === "owner" ? "brand" : "neutral"}>{m.role}</Pill>
                    {isOwner && m.userId !== ctx.userId && (
                      <div className="flex gap-1 w-full sm:w-auto pl-12 sm:pl-0">
                        <ConfirmForm
                          action={setMemberRoleAction}
                          hidden={{ userId: m.userId, role: m.role === "owner" ? "member" : "owner" }}
                          confirm={m.role === "owner" ? `Make ${m.name} a regular member? They lose access to the Vault and household settings.` : `Make ${m.name} an owner? Owners can open the Vault, invite and remove people.`}
                          variant="ghost"
                          size="sm"
                        >
                          {m.role === "owner" ? "Make member" : "Make owner"}
                        </ConfirmForm>
                        <ConfirmForm action={removeMemberAction} hidden={{ userId: m.userId }} confirm={`Remove ${m.name} from ${household.name}? They keep their account but lose access to this home.`} variant="ghost" size="sm">
                          Remove
                        </ConfirmForm>
                      </div>
                    )}
                  </li>
                ))}
              </ul>
            </div>

            {isOwner ? (
              <div className="border-t border-line pt-4 flex flex-col gap-3">
                <div>
                  <h3 className="font-semibold">Invite someone</h3>
                  <p className="text-sm text-ink-2 mt-0.5">A partner, co-owner or roommate. Members see and edit everything except the Vault, which stays with owners.</p>
                </div>
                <InviteForm emailReady={emailReady} />
                {invites.length > 0 && (
                  <div>
                    <div className="eyebrow mb-1">Waiting to be accepted</div>
                    <ul className="flex flex-col divide-y divide-line">
                      {invites.map((i) => (
                        <li key={i.id} className="flex items-center gap-3 py-2">
                          <div className="flex-1 min-w-0">
                            <div className="text-[15px] truncate">{i.email ?? "Link invite"}</div>
                            <div className="text-sm text-ink-3">Expires {formatDate(i.expiresAt.toISOString().slice(0, 10))}</div>
                          </div>
                          <ConfirmForm action={revokeInviteAction} hidden={{ id: i.id }} confirm="Cancel this invite? The link stops working." variant="ghost" size="sm">
                            Cancel
                          </ConfirmForm>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            ) : null}

            {members.length > 1 && (isOwner ? otherOwners > 0 : true) && (
              <div className="border-t border-line pt-4">
                <p className="text-sm text-ink-2 mb-2">Leaving removes your access to {household.name}. Its records stay with the others, and you start fresh with an empty home of your own.</p>
                <ConfirmForm action={leaveHouseholdAction} confirm={`Leave ${household.name}? You will lose access to its records.`} variant="secondary" size="sm">
                  Leave household
                </ConfirmForm>
              </div>
            )}
          </Card>
        </Section>

        <Section title="Reminders" description="Home Base can come to you, so you do not have to remember to check it.">
          <div id="reminders" className="flex flex-col gap-3 scroll-mt-24">
            <Card className="p-4 sm:p-5 flex flex-col gap-3">
              <div>
                <h3 className="font-semibold">Calendar</h3>
                <p className="text-sm text-ink-2 mt-0.5">Scheduled maintenance, warranty end dates and document expirations, in the calendar you already use. Tasks get an alert at 9 AM on the day they are due; overdue ones stay on today until you finish them.</p>
              </div>
              {feed && <p className="text-sm text-ink-3">Linked {formatDate(feed.createdAt.toISOString().slice(0, 10))}{feed.lastFetchedAt ? `. Last checked by your calendar ${formatDate(feed.lastFetchedAt.toISOString().slice(0, 10))}.` : ". Not checked by a calendar yet."}</p>}
              <CalendarFeedForm exists={Boolean(feed)} />
              {feed && (
                <ConfirmForm action={deleteCalendarFeedAction} confirm="Turn off the calendar link? Subscribed calendars stop updating and the events disappear." variant="ghost" size="sm" className="-ml-3">
                  Turn off calendar link
                </ConfirmForm>
              )}
            </Card>
            <Card className="p-4 sm:p-5 flex flex-col gap-3">
              <div>
                <h3 className="font-semibold">Weekly email</h3>
                <p className="text-sm text-ink-2 mt-0.5">Monday morning: what is overdue, what is due this week, and anything expiring in the next 30 days. Sent to {ctx.user.email}. Weeks with nothing to report send nothing.</p>
              </div>
              {!emailReady && <p className="text-sm text-warn">Email is not set up on this server yet, so this cannot be turned on.</p>}
              <DigestForm on={prefs.weeklyDigest} emailReady={emailReady} />
            </Card>
          </div>
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
