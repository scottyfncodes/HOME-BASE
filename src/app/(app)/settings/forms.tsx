"use client";
import { useState } from "react";
import { Button, buttonClass } from "@/components/ui/button";
import { ActionForm } from "@/components/ui/action-form";
import { Field, FormMessage, Input } from "@/components/ui/field";
import { SubmitButton } from "@/components/ui/submit-button";
import { createCalendarFeedAction, createInviteAction, deleteAccountAction, renameHouseholdAction, setDigestAction } from "./actions";

export function RenameHouseholdForm({ name }: { name: string }) {
  return (
    <ActionForm action={renameHouseholdAction} className="flex flex-col gap-2">
      {(state) => (
        <>
          <div className="flex items-end gap-2">
            <Field label="Household name" htmlFor="name" error={state.errors?.name} className="flex-1">
              <Input id="name" name="name" defaultValue={name} required />
            </Field>
            <SubmitButton variant="secondary">Save</SubmitButton>
          </div>
          {state.ok && state.message && <FormMessage message={state.message} ok />}
        </>
      )}
    </ActionForm>
  );
}

export function DeleteAccountForm() {
  return (
    <ActionForm action={deleteAccountAction} className="flex flex-col gap-3 max-w-sm">
      {(state) => (
        <>
          <FormMessage message={state.ok === false ? state.message : undefined} />
          <Field label="Your password" htmlFor="password" error={state.errors?.password}>
            <Input id="password" name="password" type="password" autoComplete="current-password" required />
          </Field>
          <Field label="Type DELETE to confirm" htmlFor="confirm" error={state.errors?.confirm}>
            <Input id="confirm" name="confirm" autoCapitalize="characters" autoComplete="off" required />
          </Field>
          <div>
            <SubmitButton variant="danger" pendingText="Deleting…">
              Delete my account
            </SubmitButton>
          </div>
        </>
      )}
    </ActionForm>
  );
}

export function CopyField({ value, label }: { value: string; label: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <div className="flex flex-col gap-1.5">
      <span className="text-sm font-semibold text-ink-2">{label}</span>
      <div className="flex gap-2">
        <Input readOnly value={value} onFocus={(e) => e.currentTarget.select()} className="font-mono text-[13px]" aria-label={label} />
        <Button
          type="button"
          variant="secondary"
          onClick={async () => {
            try {
              await navigator.clipboard.writeText(value);
              setCopied(true);
              setTimeout(() => setCopied(false), 2000);
            } catch {
              /* clipboard blocked: the field is selectable */
            }
          }}
        >
          {copied ? "Copied" : "Copy"}
        </Button>
      </div>
    </div>
  );
}

export function InviteForm({ emailReady }: { emailReady: boolean }) {
  return (
    <ActionForm action={createInviteAction} className="flex flex-col gap-3">
      {(state) => (
        <>
          <div className="flex items-end gap-2">
            <Field label="Their email" htmlFor="invite-email" optional className="flex-1">
              <Input id="invite-email" name="email" type="email" inputMode="email" autoCapitalize="none" defaultValue={state.values?.email} invalid={Boolean(state.errors?.email)} />
            </Field>
            <SubmitButton variant="secondary" pendingText="Creating…">
              Invite
            </SubmitButton>
          </div>
          {!state.message && <p className="text-sm text-ink-3 -mt-1">{emailReady ? "We email them the link. Leave blank to just get a link." : "Leave blank to just get a link to send yourself."}</p>}
          {state.message && (state.data?.unsent ? <p className="rounded-xl bg-warn-soft text-warn px-3 py-2 text-sm">{state.message}</p> : <FormMessage message={state.message} ok={state.ok} />)}
          {state.ok && state.data?.link && <CopyField label="Invite link" value={state.data.link} />}
        </>
      )}
    </ActionForm>
  );
}

export function CalendarFeedForm({ exists }: { exists: boolean }) {
  return (
    <ActionForm action={createCalendarFeedAction} className="flex flex-col gap-3">
      {(state) =>
        state.ok && state.data?.url ? (
          <>
            <p className="text-sm text-ink-2">On your iPhone, tap Subscribe and confirm. Calendar checks for changes on its own, so completed and rescheduled tasks update without you doing anything.</p>
            <div className="flex flex-wrap gap-2">
              <a href={state.data.webcal} className={buttonClass("primary")}>
                Subscribe on this device
              </a>
            </div>
            <CopyField label="Or paste this into Google Calendar or Outlook (From URL)" value={state.data.url} />
            <p className="text-sm text-ink-3">Anyone with this link can see your task titles and due dates, so treat it like a password. This is the only time it is shown; make a new one any time.</p>
          </>
        ) : (
          <>
            {state.message && <FormMessage message={state.message} />}
            <div>
              <SubmitButton variant={exists ? "secondary" : "primary"} pendingText="Creating…">
                {exists ? "Make a new link" : "Get my calendar link"}
              </SubmitButton>
            </div>
            {exists && <p className="text-sm text-ink-3">Making a new link stops the old one. Subscribe again with the new one.</p>}
          </>
        )
      }
    </ActionForm>
  );
}

export function DigestForm({ on, emailReady }: { on: boolean; emailReady: boolean }) {
  return (
    <ActionForm action={setDigestAction} className="flex flex-col gap-2">
      {(state) => (
        <>
          <input type="hidden" name="on" value={on ? "0" : "1"} />
          <div className="flex flex-wrap items-center gap-3">
            <SubmitButton variant={on ? "secondary" : "primary"} disabled={!emailReady && !on}>
              {on ? "Turn off weekly email" : "Turn on weekly email"}
            </SubmitButton>
            <span className={on ? "text-sm font-semibold text-ok" : "text-sm text-ink-3"}>{on ? "On" : "Off"}</span>
          </div>
          {state.ok === false && state.message && <FormMessage message={state.message} />}
        </>
      )}
    </ActionForm>
  );
}
