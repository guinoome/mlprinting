"use client";

import Link from "next/link";
import { useFormState } from "react-dom";
import { requestPasswordReset } from "../actions";
import type { ActionState } from "@/lib/forms/action-state";
import { FormField } from "@/components/form/form-field";
import { SubmitButton } from "@/components/form/submit-button";
import { FormStatus } from "@/components/form/form-status";
import { routes } from "@/lib/config";

const initialState: ActionState = {};

/**
 * Request a recovery email.
 *
 * The reply is the same whether or not the address has an account, which is
 * also why the form stays on screen after a success: somebody who mistyped
 * their address gets no error to tell them so, and the only remedy available is
 * to try again with the right one.
 */
export function ForgotPasswordForm() {
  const [state, formAction] = useFormState(
    requestPasswordReset,
    initialState,
  );

  return (
    <form action={formAction} className="space-y-4" noValidate>
      <FormStatus state={state} />

      <FormField
        label="Email"
        name="email"
        type="email"
        autoComplete="email"
        required
        hint="We'll send a link to choose a new password."
        error={state.fieldErrors?.email}
      />

      <SubmitButton pendingLabel="Sending…" className="w-full">
        Send reset link
      </SubmitButton>

      <p className="text-center text-sm text-muted-foreground">
        <Link
          href={routes.login}
          className="underline underline-offset-4 transition-colors hover:text-foreground"
        >
          Back to sign in
        </Link>
      </p>
    </form>
  );
}
