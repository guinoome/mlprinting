"use client";

import { useFormState } from "react-dom";
import { changePassword } from "@/features/auth/actions";
import type { ActionState } from "@/features/auth/actions";
import { FormField } from "@/features/auth/components/form-field";
import { SubmitButton } from "@/features/auth/components/submit-button";
import { FormStatus } from "@/features/auth/components/form-status";

const initialState: ActionState = {};

/**
 * Password change — Ph1.md §5.
 *
 * No "current password" field: Supabase's updateUser acts on the active
 * session, so the proof of identity is the session itself. Asking for the
 * current password again would be theatre unless we verified it, and verifying
 * it means a second round trip that changes nothing about who can call this.
 */
export function PasswordForm() {
  const [state, formAction] = useFormState(changePassword, initialState);

  return (
    <form action={formAction} className="space-y-4" noValidate>
      <FormStatus state={state} />

      <FormField
        label="New password"
        name="password"
        type="password"
        autoComplete="new-password"
        required
        hint="At least 8 characters. Longer beats complicated."
        error={state.fieldErrors?.password}
      />

      <FormField
        label="Confirm new password"
        name="confirmPassword"
        type="password"
        autoComplete="new-password"
        required
        error={state.fieldErrors?.confirmPassword}
      />

      <SubmitButton pendingLabel="Updating…">Update password</SubmitButton>
    </form>
  );
}
