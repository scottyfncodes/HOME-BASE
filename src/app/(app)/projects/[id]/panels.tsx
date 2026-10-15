"use client";
import { useActionState, useRef } from "react";
import type { ActionState } from "@/lib/actions";
import { Check, Flag, Plus, Trash2 } from "lucide-react";
import { ActionForm } from "@/components/ui/action-form";
import { Field, FormMessage, Input, Select } from "@/components/ui/field";
import { SubmitButton } from "@/components/ui/submit-button";
import { formatDate } from "@/core/domain/dates";
import { cn } from "@/lib/cn";
import { addProjectTaskAction, deleteProjectTaskAction, linkAssetAction, toggleProjectTaskAction } from "../actions";

type Task = { id: string; title: string; isMilestone: boolean; dueOn: string | null; completedOn: string | null };

export function Checklist({ projectId, tasks }: { projectId: string; tasks: Task[] }) {
  return (
    <div className="flex flex-col gap-3">
      {tasks.length > 0 && (
        <ul className="card divide-y divide-line overflow-hidden">
          {tasks.map((t) => (
            <ChecklistItem key={t.id} task={t} />
          ))}
        </ul>
      )}
      <AddStepForm projectId={projectId} />
    </div>
  );
}

function AddStepForm({ projectId }: { projectId: string }) {
  const formRef = useRef<HTMLFormElement>(null);
  const [state, formAction] = useActionState(
    async (prev: ActionState, fd: FormData) => {
      const result = await addProjectTaskAction(prev, fd);
      if (result.ok) formRef.current?.reset();
      return result;
    },
    {} as ActionState,
  );
  return (
    <form ref={formRef} action={formAction} className="flex flex-col gap-2" noValidate>
        <input type="hidden" name="projectId" value={projectId} />
        <div className="flex flex-col sm:flex-row gap-2 sm:items-start">
          <div className="flex-1 min-w-0">
            <Input name="title" placeholder="Add a step…" aria-label="New step" required />
            {state.errors?.title && <p className="text-sm text-danger mt-1">{state.errors.title}</p>}
          </div>
          <div className="flex gap-2">
            <Select name="isMilestone" aria-label="Type" className="flex-1 sm:w-36" defaultValue="false">
              <option value="false">Step</option>
              <option value="true">Milestone</option>
            </Select>
            <SubmitButton size="md" variant="secondary" pendingText="Adding…" aria-label="Add step" className="shrink-0">
              <Plus className="size-4" aria-hidden /> Add
            </SubmitButton>
          </div>
        </div>
        <FormMessage message={state.ok === false ? state.message : undefined} />
    </form>
  );
}

function ChecklistItem({ task }: { task: Task }) {
  const [, toggle, toggling] = useActionState(toggleProjectTaskAction, {});
  const [, remove, removing] = useActionState(deleteProjectTaskAction, {});
  const done = Boolean(task.completedOn);
  return (
    <li className={cn("flex items-center gap-3 px-3 py-2 min-h-12", (toggling || removing) && "opacity-60")}>
      <form action={toggle}>
        <input type="hidden" name="taskId" value={task.id} />
        <input type="hidden" name="done" value={done ? "0" : "1"} />
        <button type="submit" aria-label={done ? "Mark not done" : "Mark done"} aria-pressed={done} className={cn("size-7 rounded-full border-2 flex items-center justify-center transition-colors", done ? "bg-brand border-brand text-brand-ink" : "border-line-strong hover:border-brand")}>
          {done && <Check className="size-4" aria-hidden />}
        </button>
      </form>
      <div className="flex-1 min-w-0">
        <div className={cn("text-[15px] flex items-center gap-1.5", done && "line-through text-ink-3")}>
          {task.isMilestone && <Flag className="size-3.5 text-accent shrink-0" aria-label="Milestone" />}
          <span className="truncate">{task.title}</span>
        </div>
        {(task.dueOn || task.completedOn) && <div className="text-xs text-ink-3">{done ? `Done ${formatDate(task.completedOn)}` : `Due ${formatDate(task.dueOn)}`}</div>}
      </div>
      <form action={remove}>
        <input type="hidden" name="taskId" value={task.id} />
        <button type="submit" aria-label="Remove step" className="size-8 rounded-lg text-ink-3 hover:text-danger hover:bg-danger-soft flex items-center justify-center">
          <Trash2 className="size-4" aria-hidden />
        </button>
      </form>
    </li>
  );
}

export function LinkAssetForm({ projectId, assets }: { projectId: string; assets: Array<{ id: string; name: string }> }) {
  if (assets.length === 0) return <p className="text-sm text-ink-3">Every item in your inventory is already linked, or you have none yet.</p>;
  return (
    <ActionForm action={linkAssetAction} className="flex flex-col gap-2">
      {(state) => (
        <>
          <input type="hidden" name="projectId" value={projectId} />
          <div className="flex gap-2 items-end">
            <Field label="Link an item" htmlFor="assetId" className="flex-1">
              <Select id="assetId" name="assetId" defaultValue="">
                <option value="">Choose an item…</option>
                {assets.map((a) => (
                  <option key={a.id} value={a.id}>
                    {a.name}
                  </option>
                ))}
              </Select>
            </Field>
            <SubmitButton variant="secondary" pendingText="Linking…">
              Link
            </SubmitButton>
          </div>
          <FormMessage message={state.ok === false ? state.message : undefined} />
        </>
      )}
    </ActionForm>
  );
}
