import { Lock, LockOpen, Plus, ShieldAlert } from "lucide-react";
import { requirePropertyCtx } from "@/core/auth/session";
import { countVaultDocuments, listVaultDocuments } from "@/core/services/documents";
import { isVaultAvailable, listVaultAudit, VAULT_UNLOCK_MINUTES } from "@/core/services/vault";
import { VAULT_CATEGORY_LABELS } from "@/core/domain/validation";
import { formatDate, todayIn } from "@/core/domain/dates";
import { ButtonLink, Button } from "@/components/ui/button";
import { Card, EmptyState, PageHeader, Pill, Row, Section } from "@/components/ui/page";
import { DocumentThumb } from "@/components/documents/document-thumb";
import { UnlockForm } from "./unlock-form";
import { lockVaultAction } from "./actions";

export const metadata = { title: "Vault" };

export default async function VaultPage({ searchParams }: { searchParams: Promise<{ next?: string }> }) {
  const { next } = await searchParams;
  const ctx = await requirePropertyCtx();
  const available = isVaultAvailable();
  const count = await countVaultDocuments(ctx);

  if (!available) {
    return (
      <>
        <PageHeader title="Vault" description="A separate, encrypted space for the documents you would hate to lose." />
        <EmptyState icon={<ShieldAlert />} title="The Vault is not configured on this server" description="An administrator needs to set VAULT_MASTER_KEY before anything can be stored here. Nothing is stored in the Vault until then." />
      </>
    );
  }

  if (!ctx.vaultUnlocked) {
    return (
      <>
        <PageHeader title="Vault" description={count > 0 ? `${count} document${count === 1 ? "" : "s"} stored. Locked.` : "A separate, encrypted space for deeds, passports, wills and other sensitive records."} />
        <div className="flex flex-col gap-6">
          <UnlockForm next={next} minutes={VAULT_UNLOCK_MINUTES} />
          <HowItWorks />
        </div>
      </>
    );
  }

  const [docs, auditRows] = await Promise.all([listVaultDocuments(ctx), listVaultAudit(ctx, 8)]);
  const today = todayIn(ctx.timezone);
  const minutesLeft = minutesUntil(ctx.vaultUnlockedUntil);

  return (
    <>
      <PageHeader
        title="Vault"
        eyebrow={
          <span className="inline-flex items-center gap-1.5 text-ok">
            <LockOpen className="size-3.5" aria-hidden /> Unlocked for about {minutesLeft} min
          </span>
        }
        description="Encrypted at rest. Searching, exports and other household views never include these."
        actions={
          <>
            <form action={lockVaultAction}>
              <Button type="submit" variant="secondary" size="sm">
                <Lock className="size-4" aria-hidden /> Lock
              </Button>
            </form>
            <ButtonLink href="/vault/new" size="sm">
              <Plus className="size-4" aria-hidden /> Add
            </ButtonLink>
          </>
        }
      />
      <div className="flex flex-col gap-6">
        {docs.length === 0 ? (
          <EmptyState icon={<Lock />} title="The Vault is empty" description="Deeds and titles, passports and birth certificates, wills, sensitive tax records." action={<ButtonLink href="/vault/new">Add a document</ButtonLink>} />
        ) : (
          <Card className="divide-y divide-line overflow-hidden">
            {docs.map((d) => (
              <Row
                key={d.id}
                href={`/vault/${d.id}`}
                icon={<DocumentThumb file={d.file} />}
                title={d.title}
                subtitle={[VAULT_CATEGORY_LABELS[d.category as keyof typeof VAULT_CATEGORY_LABELS] ?? d.category, d.expiresOn ? `Expires ${formatDate(d.expiresOn)}` : null].filter(Boolean).join(" · ")}
                trailing={d.expiresOn && d.expiresOn < today ? <Pill tone="danger">Expired</Pill> : !d.file ? <Pill tone="warn">No file</Pill> : undefined}
              />
            ))}
          </Card>
        )}
        <Section title="Recent activity" description="Every unlock and file read is recorded.">
          <Card className="divide-y divide-line overflow-hidden">
            {auditRows.map((a) => (
              <div key={a.id} className="px-4 py-2.5 text-sm flex items-center justify-between gap-3">
                <span className="font-medium">{labelAudit(a.action)}</span>
                <span className="text-ink-3">{a.at.toLocaleString("en-US", { timeZone: ctx.timezone, month: "short", day: "numeric", hour: "numeric", minute: "2-digit" })}</span>
              </div>
            ))}
          </Card>
        </Section>
        <HowItWorks />
      </div>
    </>
  );
}

/** Server component: reading the clock here is fine, but keep it out of render for the purity lint. */
function minutesUntil(until: Date | null): number {
  if (!until) return VAULT_UNLOCK_MINUTES;
  return Math.max(1, Math.round((until.getTime() - Date.now()) / 60_000));
}

function labelAudit(action: string) {
  const map: Record<string, string> = {
    unlock: "Vault unlocked",
    unlock_failed: "Failed unlock attempt",
    unlock_blocked: "Unlock blocked (too many attempts)",
    lock: "Vault locked",
    file_read: "A Vault file was opened",
    document_create: "Document added",
    document_update: "Document updated",
    document_delete: "Document deleted",
  };
  return map[action] ?? action;
}

function HowItWorks() {
  return (
    <Card className="p-4 sm:p-5 text-sm text-ink-2 flex flex-col gap-2">
      <div className="font-semibold text-ink">How the Vault protects your files</div>
      <ul className="list-disc pl-5 flex flex-col gap-1">
        <li>Each file is encrypted with its own key before it is stored; those keys are wrapped with a server-held master key (AES-256-GCM).</li>
        <li>Opening the Vault requires your password again, and the unlock expires after {VAULT_UNLOCK_MINUTES} minutes on this device only.</li>
        <li>Vault records never appear in search, on the dashboard, or in exports made while locked. Files are served with no-cache headers.</li>
        <li>This is encryption at rest, not end-to-end encryption: the server can decrypt your files to show them to you. Do not store anything you would not trust the service operator with.</li>
      </ul>
    </Card>
  );
}
