"use client";

import Link from "next/link";
import { useFormState } from "react-dom";
import { resetPassword } from "../actions";
import type { ActionState } from "@/lib/forms/action-state";
import { FormField } from "@/components/form/form-field";
import { SubmitButton } from "@/components/form/submit-button";
import { FormStatus } from "@/components/form/form-status";
import { routes } from "@/lib/config";

const initialState: ActionState = {};

/**
 * Choose a new password after following a recovery link.
 *
 * No "current password" field, for the same reason PasswordForm has none: the
 * proof of identity is the session, which the callback established by exchanging
 * the emailed code. Somebody arriving here without one gets Supabase's refusal
 * rather than a form that pretends to work.
 */
export function ResetPasswordForm() {
  const [state, formAction] = useFormState(resetPassword, initialState);

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

      <SubmitButton pendingLabel="Saving…" className="w-full">
        Save new password
      </SubmitButton>

      {/* An expired link is the common failure, and the way out is a fresh one
          rather than retyping the same password into a dead form. */}
      {state.error ? (
        <p className="text-center text-sm text-muted-foreground">
          <Link
            href={routes.forgotPassword}
            className="underline underline-offset-4 transition-colors hover:text-foreground"
          >
            Request a new link
          </Link>
        </p>
      ) : null}
    </form>
  );
}
