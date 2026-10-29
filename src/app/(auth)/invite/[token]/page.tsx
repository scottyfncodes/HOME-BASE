import Link from "next/link";
import { getSessionOrNull } from "@/core/auth/session";
import { getDb } from "@/core/db/client";
import { previewInvite } from "@/core/services/invites";
import { ButtonLink } from "@/components/ui/button";
import { AcceptInviteForm } from "./accept-form";

export const metadata = { title: "Join a household", robots: { index: false } };
export const dynamic = "force-dynamic";

export default async function InvitePage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  const session = await getSessionOrNull();
  const invite = await previewInvite(await getDb(), token, session?.user.id);

  if (!invite) {
    return (
      <div className="card p-5 sm:p-6 flex flex-col gap-3">
        <h1 className="font-display text-2xl font-semibold">This invite has expired</h1>
        <p className="text-sm text-ink-2">Invites work once and last 7 days. Ask the person who sent it for a new link.</p>
        <Link href={session ? "/home" : "/sign-in"} className="text-sm font-semibold text-brand w-fit">
          {session ? "Go to Home Base" : "Sign in"}
        </Link>
      </div>
    );
  }

  const next = encodeURIComponent(`/invite/${token}`);
  return (
    <div className="card p-5 sm:p-6 flex flex-col gap-4">
      <div>
        <div className="eyebrow mb-1.5">Invitation</div>
        <h1 className="font-display text-2xl font-semibold leading-tight">Join {invite.householdName}</h1>
        <p className="text-sm text-ink-2 mt-2">
          {invite.inviterName} invited you to share their home on Home Base: maintenance, inventory, documents, projects and emergency info. The Vault stays with owners.
        </p>
      </div>
      {!session ? (
        <div className="flex flex-col gap-2">
          <ButtonLink href={`/sign-up?next=${next}`} size="lg">
            Create an account
          </ButtonLink>
          <ButtonLink href={`/sign-in?next=${next}`} variant="secondary" size="lg">
            I already have an account
          </ButtonLink>
        </div>
      ) : invite.current?.alreadyMember ? (
        <>
          <p className="text-sm text-ink-2">You are already a member of this household.</p>
          <ButtonLink href="/home">Go to Home Base</ButtonLink>
        </>
      ) : invite.current?.ownerWithOthers ? (
        <p className="text-sm text-warn">You own a household other people share. Make someone else an owner in Settings before you join a different one.</p>
      ) : (
        <AcceptInviteForm token={token} signedInAs={session.user.email} mustDiscard={Boolean(invite.current?.soleMember && invite.current.hasHome)} />
      )}
    </div>
  );
}
