"use client";
import { ActionForm } from "@/components/ui/action-form";
import { Field, Input } from "@/components/ui/field";
import { SubmitButton } from "@/components/ui/submit-button";
import { rescheduleTaskAction } from "../actions";

export function RescheduleForm({ id, today }: { id: string; today: string }) {
  return (
    <ActionForm action={rescheduleTaskAction} className="flex items-end gap-2">
      {(state) => (
        <>
          <input type="hidden" name="id" value={id} />
          <Field label="Put it back on the schedule" htmlFor="dueOn" error={state.errors?.dueOn}>
            <Input id="dueOn" name="dueOn" type="date" defaultValue={today} className="h-9" />
          </Field>
          <SubmitButton variant="secondary" size="sm" pendingText="Scheduling…">
            Reschedule
          </SubmitButton>
        </>
      )}
    </ActionForm>
  );
}
