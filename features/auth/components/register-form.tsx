"use client";

import { useFormState } from "react-dom";
import Link from "next/link";
import { register, type ActionState } from "../actions";
import { FormField } from "@/components/form/form-field";
import { SubmitButton } from "@/components/form/submit-button";
import { FormStatus } from "@/components/form/form-status";
import { routes } from "@/lib/config";

const initialState: ActionState = {};

export function RegisterForm() {
  const [state, formAction] = useFormState(register, initialState);

  // On success the action either redirects or returns a "confirm your email"
  // message. In the latter case the form has nothing left to ask for.
  if (state.message) {
    return (
      <div className="space-y-4">
        <FormStatus state={state} />
        <p className="text-center text-sm text-muted-foreground">
          <Link
            href={routes.login}
            className="font-medium text-foreground hover:underline"
          >
            Back to sign in
          </Link>
        </p>
      </div>
    );
  }

  return (
    <form action={formAction} className="auth-form space-y-5" noValidate>
      <FormStatus state={state} />

      <FormField
        label="Name"
        name="displayName"
        autoComplete="name"
        placeholder="Maria Santos"
        required
        className="h-12 rounded-none border-x-0 border-t-0 bg-transparent px-0 text-base focus-visible:ring-0 focus-visible:ring-offset-0"
        error={state.fieldErrors?.displayName}
      />

      <FormField
        label="Email"
        name="email"
        type="email"
        autoComplete="email"
        placeholder="you@example.com"
        required
        className="h-12 rounded-none border-x-0 border-t-0 bg-transparent px-0 text-base focus-visible:ring-0 focus-visible:ring-offset-0"
        error={state.fieldErrors?.email}
      />

      <FormField
        label="Password"
        name="password"
        type="password"
        autoComplete="new-password"
        required
        className="h-12 rounded-none border-x-0 border-t-0 bg-transparent px-0 text-base focus-visible:ring-0 focus-visible:ring-offset-0"
        hint="At least 8 characters. Longer beats complicated."
        error={state.fieldErrors?.password}
      />

      <SubmitButton className="h-12 w-full rounded-none text-sm uppercase tracking-[0.18em]" pendingLabel="Creating account…">
        Create account
      </SubmitButton>

      <p className="text-center text-sm text-muted-foreground">
        Already have an account?{" "}
        <Link
          href={routes.login}
          className="font-medium text-foreground hover:underline"
        >
          Sign in
        </Link>
      </p>
    </form>
  );
}
