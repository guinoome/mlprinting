"use client";

import { useFormState } from "react-dom";
import { updateAvatar } from "../actions";
import type { ActionState } from "@/lib/forms/action-state";
import { SubmitButton } from "@/components/form/submit-button";
import { FormStatus } from "@/components/form/form-status";
import { FileDrop } from "@/components/ui/file-drop";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { initialsFrom } from "@/lib/utils";

const initialState: ActionState = {};

/**
 * Profile picture — Ph1.md §5.
 * First consumer of the upload framework (Ph1.md §8), which is the point:
 * a service with no caller is a service nobody has proved works.
 */
export function AvatarForm({
  avatarUrl,
  name,
}: {
  avatarUrl: string | null;
  name: string;
}) {
  const [state, formAction] = useFormState(updateAvatar, initialState);

  return (
    <form action={formAction} className="space-y-4">
      <FormStatus state={state} />

      <div className="flex items-center gap-4">
        <Avatar className="size-16">
          {avatarUrl ? <AvatarImage src={avatarUrl} alt="" /> : null}
          <AvatarFallback className="text-lg">
            {initialsFrom(name)}
          </AvatarFallback>
        </Avatar>
        <p className="text-sm text-muted-foreground">
          Shown beside your name across the platform.
        </p>
      </div>

      <FileDrop name="avatar" kind="image" />

      <SubmitButton variant="outline" pendingLabel="Uploading…">
        Upload picture
      </SubmitButton>
    </form>
  );
}
