"use client";

import { useFormState } from "react-dom";
import { updateProfile } from "../actions";
import type { ActionState } from "@/features/auth/actions";
import { FormField } from "@/features/auth/components/form-field";
import { SubmitButton } from "@/features/auth/components/submit-button";
import { FormStatus } from "@/features/auth/components/form-status";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

const initialState: ActionState = {};

export function ProfileForm({
  displayName,
  email,
}: {
  displayName: string | null;
  email: string;
}) {
  const [state, formAction] = useFormState(updateProfile, initialState);

  return (
    <form action={formAction} className="space-y-4" noValidate>
      <FormStatus state={state} />

      <FormField
        label="Name"
        name="displayName"
        defaultValue={displayName ?? ""}
        autoComplete="name"
        required
        error={state.fieldErrors?.displayName}
      />

      <div className="space-y-2">
        <Label htmlFor="email">Email</Label>
        <Input id="email" name="email" value={email} disabled readOnly />
        <p className="text-xs text-muted-foreground">
          Changing your email address needs a confirmation step, so it is
          handled separately from this form.
        </p>
      </div>

      <SubmitButton pendingLabel="Saving…">Save changes</SubmitButton>
    </form>
  );
}
